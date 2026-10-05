import type { TierList, TierListQuery } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { firstBy } from 'remeda';

import { clampPercentDelta, SERVER_PERIOD_TO_DB, STATS_MODE_TO_DB } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { TIER_LIST } from '../config';
import { rankTierList } from '../lib';

@Injectable()
export class TierListReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async tierList(query: TierListQuery): Promise<TierList> {
    const mode = STATS_MODE_TO_DB[query.mode];
    const period = SERVER_PERIOD_TO_DB[query.period];
    const minBattles = query.minBattles ?? TIER_LIST.defaultMinBattles;

    const [rows, previous, eligible] = await Promise.all([
      this.prisma.tankServerStats.findMany({ where: { mode, period, cohort: 'all', battles: { gte: minBattles } } }),
      period === TIER_LIST.trendPeriod
        ? Promise.resolve([])
        : this.prisma.tankServerStats.findMany({ where: { mode, period: TIER_LIST.trendPeriod, cohort: 'all' } }),
      this.catalog.filter({ tiers: query.tier ? [query.tier] : undefined, types: query.type ? [query.type] : undefined })
    ]);

    const vehicles = new Map(eligible.map((entry) => [entry.summary.tankId, entry.summary]));
    const previousOf = new Map(previous.map((row) => [row.tankId, row.winRateDiff]));

    const ranked = rankTierList(
      rows
        .filter((row) => vehicles.has(row.tankId))
        .map((row) => ({
          tankId: row.tankId,
          winRateDiff: row.winRateDiff,
          battles: row.battles,
          storedRank: row.tierListRank,
          previousWinRateDiff: previousOf.get(row.tankId) ?? null
        }))
    );

    const generatedAt = firstBy(rows, [(row) => row.computedAt, 'desc'])?.computedAt ?? new Date(0);

    return {
      mode: query.mode,
      period: query.period,
      generatedAt: (rows.length > 0 ? generatedAt : new Date()).toISOString(),
      entries: ranked.flatMap((entry) => {
        const vehicle = vehicles.get(entry.tankId);

        return vehicle
          ? [
              {
                vehicle,
                rank: entry.rank,
                score: entry.score,
                winRateDiff: clampPercentDelta(entry.winRateDiff) ?? 0,
                battles: Math.max(0, entry.battles),
                trend: entry.trend
              }
            ]
          : [];
      })
    };
  }
}
