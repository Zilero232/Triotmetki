import { describe, expect, it, vi } from 'vitest';

import type { MapStatsQueries } from '../../queries/map-stats.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { MapStatsAggregateService } from '../map-stats-aggregate.service';

const createService = () => {
  const prisma = mockPrismaService();
  const queries = { rotationCounts: vi.fn<MapStatsQueries['rotationCounts']>(), queueTimes: vi.fn<MapStatsQueries['queueTimes']>() };

  prisma.$transaction.mockResolvedValue([]);

  return { queries, service: new MapStatsAggregateService(prisma, queries) };
};

describe('MapStatsAggregateService.compute', () => {
  it('reports one rotation row per counted map and one queue row per cell', async () => {
    const { queries, service } = createService();

    queries.rotationCounts.mockResolvedValue([
      { arenaId: 'a', tier: 0, mode: 'random', battles: 2, modBattles: 2, replayBattles: 0 },
      { arenaId: 'b', tier: 0, mode: 'random', battles: 1, modBattles: 0, replayBattles: 1 }
    ]);

    queries.queueTimes.mockResolvedValue([{ tier: 0, hour: 12, mode: 'random', samples: 3, avgSec: 20, medianSec: 20, p90Sec: 28 }]);

    const result = await service.compute(new Date('2026-10-05T12:00:00Z'));

    expect(result).toEqual({ rotation: 2, queue: 1 });
  });

  it('writes nothing new when no battle fell into the window', async () => {
    const { queries, service } = createService();

    queries.rotationCounts.mockResolvedValue([]);
    queries.queueTimes.mockResolvedValue([]);

    const result = await service.compute(new Date('2026-10-05T12:00:00Z'));

    expect(result).toEqual({ rotation: 0, queue: 0 });
  });
});
