import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ServerQueries } from '../../server.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { TRACKING_TIER_AGGREGATE } from '../../config/server.constants';
import { TrackingTierAggregateService } from '../tracking-tier-aggregate.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createTiers = () => {
  const prisma = mockPrismaService();
  const queries = mock<ServerQueries>();

  queries.promotePinned.mockResolvedValue(0);
  queries.demoteIdle.mockResolvedValue(0);
  prisma.player.updateMany.mockResolvedValue({ count: 0 });

  return { prisma, queries, service: new TrackingTierAggregateService(prisma, queries) };
};

describe('TrackingTierAggregateService.run', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('demotes actives that nobody viewed within the idle window', async () => {
    const { queries, service } = createTiers();

    await service.run();

    expect(queries.demoteIdle.mock.calls[0]?.[0]?.idleSince).toEqual(subDays(NOW, TRACKING_TIER_AGGREGATE.activeIdleDays));
  });

  it('revives and retires players around the same dormancy boundary', async () => {
    const { prisma, service } = createTiers();
    const boundary = subDays(NOW, TRACKING_TIER_AGGREGATE.dormantAfterDays);

    await service.run();

    const [revive, retire] = prisma.player.updateMany.mock.calls.map(([args]) => args);

    expect(revive?.where).toEqual({ trackingTier: 'dormant', lastBattleAt: { gte: boundary } });
    expect(retire?.where).toEqual({ trackingTier: 'population', lastBattleAt: { lt: boundary } });
  });

  it('reports the count of each transition', async () => {
    const { prisma, queries, service } = createTiers();

    queries.promotePinned.mockResolvedValue(1);
    queries.demoteIdle.mockResolvedValue(2);
    prisma.player.updateMany.mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce({ count: 4 });

    expect(await service.run()).toEqual({ promoted: 1, demoted: 2, revived: 3, retired: 4 });
  });
});
