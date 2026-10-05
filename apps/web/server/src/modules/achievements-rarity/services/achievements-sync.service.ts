import { Inject, Injectable, Optional } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { LestaClients } from '../../../core';
import type { AchievementsFetchResult } from '../achievements-rarity.types';
import type { AchievementsSyncQueries, FetchCandidateRow } from '../queries/achievements-sync.types';

import { Prisma } from '../../../../generated';
import { LESTA_CLIENTS, PrismaService } from '../../../core';
import { accountAchievementsSchema } from '../../../lib/lesta';
import { PurgeGuardService } from '../../collector';
import { ACHIEVEMENTS_FETCH } from '../config/fetch.constants';
import { ACHIEVEMENTS_RARITY_TOKENS } from '../config/tokens.constants';
import { achievementsSyncQueries } from '../queries/achievements-sync.queries';

@Injectable()
export class AchievementsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    private readonly guard: PurgeGuardService,
    @Optional() @Inject(ACHIEVEMENTS_RARITY_TOKENS.syncQueries) private readonly queries: AchievementsSyncQueries = achievementsSyncQueries
  ) {}

  async fetch(now = new Date()): Promise<AchievementsFetchResult> {
    const candidates = await this.queries.fetchCandidates({
      db: this.prisma.$kysely,
      staleBefore: subDays(now, ACHIEVEMENTS_FETCH.refreshDays),
      limit: ACHIEVEMENTS_FETCH.batch
    });

    if (candidates.length === 0) {
      return { requested: 0, stored: 0 };
    }

    const downloaded = await this.download(candidates);
    const blocked = await this.guard.blocked(downloaded.map(({ accountId }) => Number(accountId)));
    const rows = downloaded.filter(({ accountId }) => !blocked.has(Number(accountId)));

    await this.prisma.$transaction(
      rows.map(({ accountId, counts, maxSeries }) =>
        this.prisma.accountAchievements.upsert({
          where: { accountId },
          create: { accountId, counts, maxSeries, fetchedAt: now },
          update: { counts, maxSeries, fetchedAt: now }
        })
      )
    );

    return { requested: candidates.length, stored: rows.length };
  }

  private async download(candidates: readonly FetchCandidateRow[]) {
    const byAccount = await this.clients.bulk.account.achievements({
      accountIds: candidates.map(({ accountId }) => String(accountId)),
      fields: ACHIEVEMENTS_FETCH.fields
    });

    return candidates.flatMap(({ accountId }) => {
      const entry = accountAchievementsSchema.safeParse(byAccount[String(accountId)]);

      return entry.success
        ? [{ accountId: BigInt(accountId), counts: entry.data.achievements, maxSeries: entry.data.max_series ?? Prisma.JsonNull }]
        : [];
    });
  }
}
