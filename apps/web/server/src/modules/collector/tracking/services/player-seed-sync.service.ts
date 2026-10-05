import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { LestaClients } from '../../../../core';
import type { ClanRefreshPayload } from '../../contracts';
import type { SeedResult } from '../tracking.types';

import { errorMessage } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { chunkIds } from '../../../../lib/lesta';
import { COLLECTOR_STATE_KEY } from '../../config';
import { JOB, QUEUE } from '../../contracts';
import { PurgeGuardService } from '../../purge';
import { TRACKING } from '../config/tracking.constants';
import { collectIds } from '../lib/seed/seed';
import { toClanRecord } from '../mappers/clans.mappers';
import { DispatchService } from './dispatch.service';

@Injectable()
export class PlayerSeedSyncService {
  private readonly logger = new Logger(PlayerSeedSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
    private readonly guard: PurgeGuardService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @InjectQueue(QUEUE.clans) private readonly clansQueue: Queue
  ) {}

  async seed(): Promise<SeedResult> {
    const accounts = await this.seedFromRatings();
    const clans = await this.seedFromClans();
    const value = { accounts, clans, finishedAt: new Date().toISOString() };

    await this.prisma.collectorState.upsert({
      where: { key: COLLECTOR_STATE_KEY.seed },
      create: { key: COLLECTOR_STATE_KEY.seed, value },
      update: { value }
    });

    this.logger.log(`seeded ${accounts} accounts and ${clans} clans`);

    return { accounts, clans };
  }

  private async seedFromRatings(): Promise<number> {
    const found = new Set<number>();

    for (const type of TRACKING.seed.ratingTypes) {
      for (const rankField of TRACKING.seed.rankFields) {
        try {
          const data = await this.clients.bulk.ratings.top({ params: { type, rank_field: rankField, limit: TRACKING.seed.ratingsLimit } });

          for (const accountId of collectIds({ value: data, key: 'account_id' })) {
            found.add(accountId);
          }
        } catch (error) {
          this.logger.warn(`ratings/top ${type}/${rankField} failed: ${errorMessage(error)}`);
        }
      }
    }

    const known = await this.prisma.player.findMany({ where: { accountId: { in: [...found].map(BigInt) } }, select: { accountId: true } });
    const knownIds = new Set(known.map((player) => Number(player.accountId)));
    const blocked = await this.guard.blocked([...found]);
    const fresh = [...found].filter((accountId) => !knownIds.has(accountId) && !blocked.has(accountId));

    await this.dispatch.enqueueSweep(fresh);

    return fresh.length;
  }

  private async seedFromClans(): Promise<number> {
    const clanIds: number[] = [];

    for (let pageNo = 1; pageNo <= TRACKING.seed.clanPages; pageNo += 1) {
      const page = await this.clients.bulk.clans.list({ limit: TRACKING.seed.clanPageLimit, pageNo });

      if (page.length === 0) {
        break;
      }

      await this.prisma.clan.createMany({
        data: page.map(toClanRecord),
        skipDuplicates: true
      });

      clanIds.push(...page.map((clan) => clan.clan_id));
    }

    await this.clansQueue.addBulk(
      chunkIds({ ids: clanIds }).map((part) => ({
        name: JOB.clans.refresh,
        data: { clanIds: part, snapshot: false } satisfies ClanRefreshPayload
      }))
    );

    return clanIds.length;
  }
}
