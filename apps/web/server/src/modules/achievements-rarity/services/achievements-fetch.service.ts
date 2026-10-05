import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { LestaClients } from '../../../core';
import type { AchievementsFetchResult } from '../achievements-rarity.types';
import type { FetchCandidateRow } from '../queries';

import { Prisma } from '../../../../generated';
import { LESTA_CLIENTS, PrismaService } from '../../../core';
import { accountAchievementsSchema } from '../../../lib/lesta';
import { ACHIEVEMENTS_FETCH } from '../config';
import { fetchCandidatesSql } from '../queries';

@Injectable()
export class AchievementsFetchService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async fetch(now = new Date()): Promise<AchievementsFetchResult> {
    const candidates = await this.prisma.$queryRaw<FetchCandidateRow[]>(
      fetchCandidatesSql({ staleBefore: subDays(now, ACHIEVEMENTS_FETCH.refreshDays), limit: ACHIEVEMENTS_FETCH.batch })
    );

    if (candidates.length === 0) {
      return { requested: 0, stored: 0 };
    }

    const byAccount = await this.clients.bulk.account.achievements({
      accountIds: candidates.map(({ accountId }) => String(accountId)),
      fields: ACHIEVEMENTS_FETCH.fields
    });

    const rows = candidates.flatMap(({ accountId }) => {
      const entry = accountAchievementsSchema.safeParse(byAccount[String(accountId)]);

      return entry.success ? [{ accountId, counts: entry.data.achievements, maxSeries: entry.data.max_series ?? Prisma.JsonNull }] : [];
    });

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
}
