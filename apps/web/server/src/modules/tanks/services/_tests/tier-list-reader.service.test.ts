import type { TierListQuery } from '@otmetki/schemas';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TankServerStats } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';

import { TIER_LIST } from '../../config';
import { TierListReaderService } from '../tier-list-reader.service';
import { catalogEntry, serverStats, vehicle } from './tanks.fixtures';

const NOW = new Date('2026-09-26T12:00:00Z');

const query: TierListQuery = { mode: 'random', period: '7d' };

const createService = ({ current = [], previous = [] }: { current?: TankServerStats[]; previous?: TankServerStats[] } = {}) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();

  catalog.filter.mockResolvedValue([1, 2, 3].map((tankId) => catalogEntry(vehicle({ tankId }))));
  prisma.tankServerStats.findMany.mockResolvedValueOnce(current).mockResolvedValueOnce(previous);

  return { service: new TierListReaderService(prisma, catalog), prisma, catalog };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TierListReaderService.tierList', () => {
  it('orders tanks by win-rate advantage and keeps a stored rank', async () => {
    const { service } = createService({
      current: [
        serverStats({ tankId: 1, winRateDiff: -1 }),
        serverStats({ tankId: 2, winRateDiff: 3, tierListRank: 'A' }),
        serverStats({ tankId: 3, winRateDiff: 1 })
      ]
    });

    const list = await service.tierList(query);

    expect(list.entries.map((entry) => entry.vehicle.tankId)).toEqual([2, 3, 1]);
    expect(list.entries[0]?.rank).toBe('A');
  });

  it('drops tanks outside the requested tier and type', async () => {
    const { service } = createService({ current: [serverStats({ tankId: 1 }), serverStats({ tankId: 42 })] });

    const list = await service.tierList(query);

    expect(list.entries.map((entry) => entry.vehicle.tankId)).toEqual([1]);
  });

  it('marks a tank trending up or down against the 30-day period', async () => {
    const { service } = createService({
      current: [serverStats({ tankId: 1, winRateDiff: 2 }), serverStats({ tankId: 2, winRateDiff: -2 }), serverStats({ tankId: 3, winRateDiff: 0 })],
      previous: [
        serverStats({ tankId: 1, period: 'd30', winRateDiff: 0 }),
        serverStats({ tankId: 2, period: 'd30', winRateDiff: 0 }),
        serverStats({ tankId: 3, period: 'd30', winRateDiff: TIER_LIST.trendThreshold / 2 })
      ]
    });

    const list = await service.tierList(query);
    const trendOf = (tankId: number) => list.entries.find((entry) => entry.vehicle.tankId === tankId)?.trend;

    expect([trendOf(1), trendOf(2), trendOf(3)]).toEqual(['up', 'down', 'flat']);
  });

  it('has no trend when the list itself is the 30-day period', async () => {
    const { service, prisma } = createService({ current: [serverStats({ tankId: 1, period: 'd30' })] });

    const list = await service.tierList({ ...query, period: '30d' });

    expect(list.entries[0]?.trend).toBeNull();
    expect(prisma.tankServerStats.findMany).toHaveBeenCalledTimes(1);
  });

  it('applies the default battle floor when none is requested', async () => {
    const { service, prisma } = createService();

    await service.tierList(query);

    expect(prisma.tankServerStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ battles: { gte: TIER_LIST.defaultMinBattles } })
      })
    );
  });

  it('stamps the list with the newest computation time', async () => {
    const { service } = createService({
      current: [
        serverStats({ tankId: 1, computedAt: new Date('2026-09-20T00:00:00Z') }),
        serverStats({ tankId: 2, computedAt: new Date('2026-09-24T00:00:00Z') })
      ]
    });

    expect((await service.tierList(query)).generatedAt).toBe('2026-09-24T00:00:00.000Z');
  });

  it('stamps an empty list with the current time', async () => {
    const { service } = createService();

    const list = await service.tierList(query);

    expect(list.entries).toEqual([]);
    expect(list.generatedAt).toBe(NOW.toISOString());
  });
});
