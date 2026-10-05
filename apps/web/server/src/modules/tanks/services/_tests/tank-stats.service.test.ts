import type { TankServerStatsQuery } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { TankTraitsReaderService } from '../tank-traits-reader.service';

import { TANK_STATS_RANKING } from '../../config';
import { TankStatsService } from '../tank-stats.service';
import { catalogEntry, serverStats, vehicle } from './tanks.fixtures';

const query: TankServerStatsQuery = { period: '7d', cohort: 'all', mode: 'random', minBattles: 0, order: 'desc', limit: 25, offset: 0 };

const eligible = [
  catalogEntry(vehicle({ tankId: 1, tier: 10 })),
  catalogEntry(vehicle({ tankId: 2, tier: 6 })),
  catalogEntry(vehicle({ tankId: 3, tier: 8 }))
];

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const traits = mock<TankTraitsReaderService>();

  catalog.filter.mockResolvedValue(eligible);
  traits.filter.mockImplementation(async ({ entries }) => [...entries]);

  prisma.tankServerStats.findMany.mockResolvedValue([
    serverStats({ tankId: 1, battles: 500, winRate: 48 }),
    serverStats({ tankId: 2, battles: 2_000, winRate: 53 }),
    serverStats({ tankId: 3, battles: 1_000, winRate: 51 }),
    serverStats({ tankId: 9, battles: 9_000, winRate: 60 })
  ]);

  return { service: new TankStatsService(prisma, catalog, traits), prisma, catalog, traits };
};

describe('TankStatsService.list', () => {
  it('sorts by battles, most first, by default', async () => {
    const { service } = createService();

    const page = await service.list(query);

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([2, 3, 1]);
  });

  it('keeps only tanks that pass the vehicle and trait filters', async () => {
    const { service, traits } = createService();

    traits.filter.mockResolvedValue(eligible.slice(0, 1));

    const page = await service.list(query);

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([1]);
    expect(page.total).toBe(1);
  });

  it('sorts by the requested column and direction', async () => {
    const { service } = createService();

    const byWinRate = await service.list({ ...query, sort: 'winRate', order: 'asc' });
    const byTier = await service.list({ ...query, sort: 'tier', order: 'asc' });

    expect(byWinRate.items.map((row) => row.vehicle.tankId)).toEqual([1, 3, 2]);
    expect(byTier.items.map((row) => row.vehicle.tankId)).toEqual([2, 3, 1]);
  });

  it('pages after sorting and reports the full total', async () => {
    const { service } = createService();

    const page = await service.list({ ...query, limit: 1, offset: 1 });

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([3]);
    expect(page.total).toBe(3);
  });

  it('describes each row with the requested period, cohort and mode', async () => {
    const { service } = createService();

    const page = await service.list({ ...query, period: '30d', cohort: 'elite', mode: 'ranked' });

    expect(page.items[0]).toMatchObject({ period: '30d', cohort: 'elite', mode: 'ranked' });
  });

  it('asks only for tanks with enough battles and players when ranking by win rate', async () => {
    const { service, prisma } = createService();

    await service.list({ ...query, sort: 'winRate' });

    expect(prisma.tankServerStats.findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      battles: { gte: TANK_STATS_RANKING.minBattles },
      players: { gte: TANK_STATS_RANKING.minPlayers }
    });
  });

  it('keeps the requested battles floor when sorting by volume', async () => {
    const { service, prisma } = createService();

    await service.list(query);

    expect(prisma.tankServerStats.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ battles: { gte: 0 }, players: { gte: 0 } });
  });

  it('ranks a large sample above a small one with a higher raw win rate', async () => {
    const { service, prisma } = createService();

    prisma.tankServerStats.findMany.mockResolvedValue([
      serverStats({ tankId: 1, battles: TANK_STATS_RANKING.minBattles, winRate: 70 }),
      serverStats({ tankId: 3, battles: 5_000, winRate: 60 })
    ]);

    const page = await service.list({ ...query, sort: 'winRate' });

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([3, 1]);
    expect(page.items.map((row) => row.winRate)).toEqual([60, 70]);
  });
});
