import { Inject, Injectable, Optional } from '@nestjs/common';

import type { MapStatsQueries } from '../queries/map-stats.types';

import { PrismaService } from '../../../core';
import { MAP_STATS } from '../config/map-stats.constants';
import { MAP_STATS_QUERIES } from '../config/tokens.constants';
import { withShares } from '../lib/rotation-share/rotation-share';
import { statsWindow } from '../lib/stats-window/stats-window';
import { mapStatsQueries } from '../queries/map-stats.queries';

@Injectable()
export class MapStatsAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(MAP_STATS_QUERIES) private readonly queries: MapStatsQueries = mapStatsQueries
  ) {}

  async compute(now = new Date()) {
    const window = { db: this.prisma.$kysely, ...statsWindow({ now, days: MAP_STATS.windowDays }) };
    const [counts, queues] = await Promise.all([this.queries.rotationCounts(window), this.queries.queueTimes(window)]);

    const common = { windowDays: MAP_STATS.windowDays, computedAt: now };
    const rotation = withShares(counts).map((row) => ({ ...row, ...common }));
    const queue = queues.map((row) => ({ ...row, ...common }));

    await this.prisma.$transaction([
      this.prisma.mapRotationAggregate.deleteMany(),
      this.prisma.mapRotationAggregate.createMany({ data: rotation }),
      this.prisma.queueTimeAggregate.deleteMany(),
      this.prisma.queueTimeAggregate.createMany({ data: queue })
    ]);

    return { rotation: rotation.length, queue: queue.length };
  }
}
