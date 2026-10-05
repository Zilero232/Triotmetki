import type { SweatIndex } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { SweatBaseline } from '../lib/sweat-index/sweat-index.types';

import { PrismaService } from '../../../core';
import { ThresholdsService, VehicleCatalogService } from '../../reference';
import { SWEAT_INDEX } from '../config/sweat-index.constants';
import { buildSweatIndex, EMPTY_SWEAT } from '../lib/sweat-index/sweat-index';

@Injectable()
export class SweatIndexService {
  private readonly cache = new LRUCache<string, Map<number, SweatIndex>>({
    max: 1,
    ttl: SWEAT_INDEX.cacheTtlMs,
    fetchMethod: () => this.load()
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly thresholds: ThresholdsService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async all(): Promise<Map<number, SweatIndex>> {
    return (await this.cache.fetch(SWEAT_INDEX.cacheKey)) ?? new Map();
  }

  async forTank(tankId: number): Promise<SweatIndex> {
    const index = await this.all();

    return index.get(tankId) ?? EMPTY_SWEAT;
  }

  private async load(): Promise<Map<number, SweatIndex>> {
    const [entries, current, stats] = await Promise.all([
      this.catalog.all(),
      this.thresholds.latest(),
      this.prisma.tankServerStats.findMany({
        where: { mode: SWEAT_INDEX.mode, period: SWEAT_INDEX.period, cohort: { in: [...SWEAT_INDEX.cohorts] } },
        select: { tankId: true, cohort: true, avgDamage: true, avgXp: true }
      })
    ]);

    const baselines = new Map<number, SweatBaseline>();

    for (const cohort of [...SWEAT_INDEX.cohorts].reverse()) {
      for (const row of stats.filter((item) => item.cohort === cohort)) {
        baselines.set(row.tankId, { damage: row.avgDamage, xp: row.avgXp });
      }
    }

    return buildSweatIndex({
      tankIds: [...entries.keys()],
      moe: new Map([...current.moe].map(([tankId, threshold]) => [tankId, threshold.p95])),
      mastery: new Map([...current.mastery].map(([tankId, threshold]) => [tankId, threshold.master])),
      baselines
    });
  }
}
