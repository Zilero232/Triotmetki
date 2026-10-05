import { Injectable } from '@nestjs/common';
import { addHours } from 'date-fns';

import type { Prisma } from '../../../../generated';
import type { OwnedById } from '../../community-core';
import type { AuthorLookups, CreatePlatoonRequest, PlatoonPage, PlatoonQuery, PlatoonView } from '../platoons.types';

import { AppBadRequestException, AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { CommunityAccountsReaderService } from '../../community-core';
import { PLATOON } from '../config/platoons.constants';
import { inWn8Range } from '../lib/wn8-range/wn8-range';
import { toPlatoonView } from '../mappers/platoon-view.mappers';

@Injectable()
export class PlatoonWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: CommunityAccountsReaderService
  ) {}

  async list({ tier, mode, hasVoice, minWn8, maxWn8, availableAt, limit, offset }: PlatoonQuery): Promise<PlatoonPage> {
    const now = new Date();
    const at = availableAt ? new Date(availableAt) : null;
    const where: Prisma.PlatoonPostWhereInput = {
      status: 'open',
      expiresAt: { gt: now },
      ...(tier === undefined ? {} : { OR: [{ tiers: { has: tier } }, { tiers: { isEmpty: true } }] }),
      ...(mode ? { modes: { has: mode } } : {}),
      ...(hasVoice === undefined ? {} : { hasVoice }),
      ...(at
        ? {
            AND: [
              { OR: [{ availableFrom: null }, { availableFrom: { lte: at } }] },
              { OR: [{ availableUntil: null }, { availableUntil: { gte: at } }] }
            ]
          }
        : {})
    };

    if (minWn8 === undefined && maxWn8 === undefined) {
      const page = await paginate({
        limit,
        offset,
        fetch: (window) => this.prisma.platoonPost.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...window }),
        count: () => this.prisma.platoonPost.count({ where })
      });

      const { stats, nicknames } = await this.lookups(page.items.map((row) => row.accountId));

      return { ...page, items: page.items.map((post) => toPlatoonView({ post, stats, nicknames })) };
    }

    const rows = await this.prisma.platoonPost.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: PLATOON.filterScanLimit });
    const { stats, nicknames } = await this.lookups(rows.map((row) => row.accountId));
    const filtered = rows.filter((row) => inWn8Range({ wn8: stats.get(row.accountId)?.wn8 ?? null, minWn8, maxWn8 }));

    return {
      items: filtered.slice(offset, offset + limit).map((post) => toPlatoonView({ post, stats, nicknames })),
      total: filtered.length,
      limit,
      offset
    };
  }

  async create({
    userId,
    accountId,
    expiresInHours,
    availableFrom,
    availableUntil,
    minWn8,
    message,
    ...rest
  }: CreatePlatoonRequest): Promise<PlatoonView> {
    const account = await this.accounts.accountOf({ userId, accountId });
    const now = new Date();

    if (availableFrom && availableUntil && new Date(availableFrom) > new Date(availableUntil)) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'availableFrom must be before availableUntil');
    }

    const post = await this.prisma.$transaction(async (tx) => {
      await tx.platoonPost.updateMany({ where: { userId, status: 'open' }, data: { status: 'closed' } });

      return tx.platoonPost.create({
        data: {
          ...rest,
          userId,
          accountId: account,
          minWn8: minWn8 ?? null,
          message: message ?? null,
          availableFrom: availableFrom ? new Date(availableFrom) : null,
          availableUntil: availableUntil ? new Date(availableUntil) : null,
          expiresAt: addHours(now, expiresInHours)
        }
      });
    });

    return toPlatoonView({ post, ...(await this.lookups([account])) });
  }

  async close({ id, userId }: OwnedById): Promise<void> {
    const { count } = await this.prisma.platoonPost.updateMany({ where: { id, userId, status: 'open' }, data: { status: 'closed' } });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No open platoon post ${id} of yours`);
    }
  }

  async expire(now: Date): Promise<number> {
    const { count } = await this.prisma.platoonPost.updateMany({ where: { status: 'open', expiresAt: { lte: now } }, data: { status: 'expired' } });

    return count;
  }

  private async lookups(accountIds: readonly bigint[]): Promise<AuthorLookups> {
    const [stats, nicknames] = await Promise.all([this.accounts.statsOf(accountIds), this.accounts.nicknamesOf(accountIds)]);

    return { stats, nicknames };
  }
}
