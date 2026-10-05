import type { PlayerInsights } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { TankServerStats } from '../../../../generated';
import type { InsightsInput } from '../players.types';

import { RATING_PERIOD_TO_DB } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { PLAYER_STATS } from '../config/player-stats.constants';
import { computeInsights } from '../lib/insights/insights';

@Injectable()
export class PlayerInsightsReaderService {
  private readonly serverReference = new LRUCache<string, Map<number, TankServerStats>>({
    max: 1,
    ttl: PLAYER_STATS.serverReference.cacheTtlMs,
    fetchMethod: () => this.loadServerReference()
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async insights({ accountId, period }: InsightsInput): Promise<PlayerInsights> {
    const [ratings, serverOf, catalog] = await Promise.all([
      this.prisma.accountTankRating.findMany({ where: { accountId, period: RATING_PERIOD_TO_DB[period] } }),
      this.serverReference.fetch(PLAYER_STATS.serverReference.cacheKey).then((cached) => cached ?? new Map<number, TankServerStats>()),
      this.catalog.all()
    ]);

    const tanks = ratings.flatMap((rating) => {
      const entry = catalog.get(rating.tankId);
      const reference = serverOf.get(rating.tankId);

      if (!entry) {
        return [];
      }

      return [
        {
          tankId: rating.tankId,
          type: entry.summary.type,
          tier: entry.summary.tier,
          battles: rating.battles,
          winRate: rating.winRate,
          avgDamage: rating.avgDamage,
          serverWinRate: reference?.winRate ?? null,
          serverAvgDamage: reference?.avgDamage ?? null
        }
      ];
    });

    const minBattles = period === 'overall' ? PLAYER_STATS.insightsMinBattles.overall : PLAYER_STATS.insightsMinBattles.recent;
    const insights = computeInsights({ tanks, minBattles });

    const withVehicle = (list: typeof insights.weakTanks) =>
      list.flatMap((tank) => {
        const entry = catalog.get(tank.tankId);

        return entry ? [{ ...tank, vehicle: entry.summary }] : [];
      });

    return {
      period,
      battles: insights.battles,
      byClass: insights.byClass,
      byTier: insights.byTier,
      weakTanks: withVehicle(insights.weakTanks),
      strongTanks: withVehicle(insights.strongTanks),
      tips: insights.tips
    };
  }

  private async loadServerReference(): Promise<Map<number, TankServerStats> | undefined> {
    const { mode, period, cohort } = PLAYER_STATS.serverReference;
    const rows = await this.prisma.tankServerStats.findMany({ where: { mode, period, cohort } });

    return rows.length === 0 ? undefined : new Map(rows.map((row) => [row.tankId, row]));
  }
}
