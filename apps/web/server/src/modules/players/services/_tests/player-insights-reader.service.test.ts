import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountTankRating, TankServerStats } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { CatalogEntry } from '../../../reference/reference.types';

import { unknownVehicle } from '../../../reference';
import { PLAYER_STATS } from '../../config';
import { PlayerInsightsReaderService } from '../player-insights-reader.service';

const entry = (tankId: number): CatalogEntry => ({
  summary: unknownVehicle(tankId),
  dbType: 'mediumTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const rating = (tankId: number, battles: number): AccountTankRating => mock<AccountTankRating>({ tankId, battles, winRate: 50, avgDamage: 1500 });

const createService = ({ ratings, server = [], catalog }: { ratings: AccountTankRating[]; server?: TankServerStats[]; catalog: CatalogEntry[] }) => {
  const prisma = mockDeep<PrismaService>();
  const vehicles = mock<VehicleCatalogService>();

  prisma.accountTankRating.findMany.mockResolvedValue(ratings);
  prisma.tankServerStats.findMany.mockResolvedValue(server);
  vehicles.all.mockResolvedValue(new Map(catalog.map((item) => [item.summary.tankId, item])));

  return new PlayerInsightsReaderService(prisma, vehicles);
};

describe('PlayerInsightsReaderService.insights', () => {
  it('skips tanks missing from the catalog', async () => {
    const service = createService({ ratings: [rating(1, 100), rating(2, 100)], catalog: [entry(1)] });

    const insights = await service.insights({ accountId: 42n, period: 'overall' });

    expect(insights.weakTanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
    expect(insights.battles).toBe(100);
  });

  it('applies a stricter battle minimum to the overall period than to recent ones', async () => {
    const battles = PLAYER_STATS.insightsMinBattles.recent;
    const ratings = [rating(1, battles)];
    const catalog = [entry(1)];

    const overall = await createService({ ratings, catalog }).insights({ accountId: 42n, period: 'overall' });
    const recent = await createService({ ratings, catalog }).insights({ accountId: 42n, period: '7d' });

    expect(overall.battles).toBe(0);
    expect(recent.battles).toBe(battles);
    expect(recent.period).toBe('7d');
  });

  it('compares against the server reference when one exists', async () => {
    const service = createService({
      ratings: [rating(1, 100)],
      server: [mock<TankServerStats>({ tankId: 1, winRate: 48, avgDamage: 1000 })],
      catalog: [entry(1)]
    });

    const [tank] = (await service.insights({ accountId: 42n, period: 'overall' })).strongTanks;

    expect(tank).toMatchObject({ serverWinRate: 48, winRateDelta: 2, damageRatio: 1.5 });
  });
});
