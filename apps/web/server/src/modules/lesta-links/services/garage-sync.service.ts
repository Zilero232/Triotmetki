import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { subHours } from 'date-fns';

import type { LestaClients } from '../../../core';
import type { GaragePayload } from '../config';
import type { GarageDispatchInput, GarageSyncInput, GarageSyncResult } from '../lesta-links.types';

import { errorMessage } from '../../../common/lib';
import { LESTA_CLIENTS, PrismaService, TokenCipherService } from '../../../core';
import { tankGarageSchema } from '../../../lib/lesta';
import { LESTA_LINKS, LESTA_LINKS_QUEUE } from '../config';
import { garageSplit, hasExpired, isTokenRejected } from '../lib';

@Injectable()
export class GarageSyncService {
  private readonly logger = new Logger(GarageSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @InjectQueue(LESTA_LINKS_QUEUE.name) private readonly queue: Queue<GaragePayload>,
    private readonly cipher: TokenCipherService
  ) {}

  async dispatch({ scope, now = new Date() }: GarageDispatchInput): Promise<number> {
    const stale = subHours(now, LESTA_LINKS.garage.resyncAfterHours);

    const links = await this.prisma.userLestaAccount.findMany({
      where: {
        accessToken: { not: null },
        tokenStaleAt: null,
        tokenExpiresAt: { gt: now },
        player: { lastPolledAt: { not: null } },
        ...(scope === 'pending' ? { garageSyncedAt: null } : { OR: [{ garageSyncedAt: null }, { garageSyncedAt: { lt: stale } }] })
      },
      orderBy: { garageSyncedAt: { sort: 'asc', nulls: 'first' } },
      take: LESTA_LINKS.garage.dispatchBatch,
      select: { accountId: true }
    });

    if (links.length === 0) {
      return 0;
    }

    await this.queue.addBulk(
      links.map(({ accountId }) => ({
        name: LESTA_LINKS_QUEUE.jobs.garage,
        data: { accountId: Number(accountId) },
        opts: { jobId: `${LESTA_LINKS.garage.jobPrefix}-${accountId}`, removeOnComplete: true }
      }))
    );

    return links.length;
  }

  async sync({ accountId, now = new Date() }: GarageSyncInput): Promise<GarageSyncResult> {
    const id = BigInt(accountId);
    const link = await this.prisma.userLestaAccount.findUnique({
      where: { accountId: id },
      select: { accessToken: true, tokenExpiresAt: true, tokenStaleAt: true }
    });

    if (!link?.accessToken || link.tokenStaleAt || hasExpired({ expiresAt: link.tokenExpiresAt, now })) {
      return { status: 'skipped' };
    }

    let rows: unknown[];

    try {
      rows = await this.clients.bulk.tanks.stats({
        accountId,
        accessToken: await this.cipher.open(link.accessToken),
        fields: LESTA_LINKS.garage.fields
      });
    } catch (error) {
      if (!isTokenRejected(error)) {
        throw error;
      }

      this.logger.warn(`garage of ${accountId} not synced, the token was rejected: ${errorMessage(error)}`);

      return { status: 'rejected' };
    }

    const split = garageSplit(
      rows.flatMap((row) => {
        const parsed = tankGarageSchema.safeParse(row);

        return parsed.success ? [parsed.data] : [];
      })
    );

    await this.prisma.$transaction([
      ...(split
        ? [
            this.prisma.playerTank.updateMany({ where: { accountId: id, tankId: { in: split.inGarage } }, data: { inGarage: true } }),
            this.prisma.playerTank.updateMany({ where: { accountId: id, tankId: { in: split.sold } }, data: { inGarage: false } })
          ]
        : []),
      this.prisma.userLestaAccount.update({ where: { accountId: id }, data: { garageSyncedAt: now } })
    ]);

    return split ? { status: 'synced', inGarage: split.inGarage.length, sold: split.sold.length } : { status: 'unknown' };
  }
}
