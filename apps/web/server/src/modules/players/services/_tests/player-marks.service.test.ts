import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountTankRating, PlayerTank } from '../../../../../generated';
import type { ThresholdsService, VehicleCatalogService } from '../../../reference';
import type { CatalogEntry, ThresholdSet } from '../../../reference/reference.types';
import type { PlayerQueries } from '../../providers/player-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { unknownVehicle } from '../../../reference';
import { PLAYER_MARKS } from '../../config';
import { PlayerMarksService } from '../player-marks.service';

const UPDATED_AT = new Date('2026-09-20T00:00:00.000Z');
const MOE_UPDATED_AT = new Date('2026-09-25T00:00:00.000Z');

type MoeThresholdRow = ThresholdSet['moe'] extends Map<number, infer Row> ? Row : never;

const entry = (tankId: number, tier: number): CatalogEntry => ({
  summary: { ...unknownVehicle(tankId), tier },
  dbType: 'heavyTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const tank = (tankId: number, overrides: Partial<PlayerTank> = {}): PlayerTank =>
  mock<PlayerTank>({
    tankId,
    battles: 100,
    marksOnGun: 0,
    markOfMastery: 0,
    moePercent: null,
    moeMovingDamage: null,
    moeUpdatedAt: null,
    updatedAt: UPDATED_AT,
    ...overrides
  });

const modReported = (overrides: Partial<PlayerTank>): Partial<PlayerTank> => ({ moePercent: 0, moeUpdatedAt: MOE_UPDATED_AT, ...overrides });

const threshold = (tankId: number): MoeThresholdRow => mock<MoeThresholdRow>({ tankId, p65: 2000, p85: 2500, p95: 3000, p100: 3500 });

type Setup = {
  tanks: PlayerTank[];
  catalog: CatalogEntry[];
  thresholds?: MoeThresholdRow[];
  combined?: Awaited<ReturnType<PlayerQueries['combinedDamage']>>;
  ratings?: AccountTankRating[];
};

const createService = (setup: Setup) => {
  const prisma = mockPrismaService();
  const queries = mock<PlayerQueries>();
  const catalog = mock<VehicleCatalogService>();
  const thresholds = mock<ThresholdsService>();

  prisma.playerTank.findMany.mockResolvedValue(setup.tanks);
  queries.combinedDamage.mockResolvedValue(setup.combined ?? []);
  prisma.accountTankRating.findMany.mockResolvedValue(setup.ratings ?? []);
  thresholds.latest.mockResolvedValue({ moe: new Map((setup.thresholds ?? []).map((row) => [row.tankId, row])), mastery: new Map() });
  catalog.all.mockResolvedValue(new Map(setup.catalog.map((item) => [item.summary.tankId, item])));

  return new PlayerMarksService(prisma, catalog, thresholds, queries);
};

describe('PlayerMarksService.marks', () => {
  it('only lists tanks from the minimum tier that exist in the catalog', async () => {
    const service = createService({
      tanks: [tank(1), tank(2), tank(3)],
      catalog: [entry(1, PLAYER_MARKS.minTier), entry(2, PLAYER_MARKS.minTier - 1)]
    });

    const { items, summary } = await service.marks(42n);

    expect(items.map((item) => item.vehicle.tankId)).toEqual([1]);
    expect(summary.eligible).toBe(1);
  });

  it('reads the marks, percent and moving damage from the tank row', async () => {
    const service = createService({
      tanks: [tank(1, modReported({ marksOnGun: 2, moePercent: 90, moeMovingDamage: 2600 }))],
      catalog: [entry(1, 10)]
    });

    const { items, summary } = await service.marks(42n);

    expect(items[0]).toMatchObject({ marksOnGun: 2, moePercent: 90, movingDamage: 2600, updatedAt: MOE_UPDATED_AT.toISOString() });
    expect(summary).toMatchObject({ moe2: 1, moe1: 0 });
  });

  it('leaves the percent empty and falls back to the row update time without mod data', async () => {
    const service = createService({ tanks: [tank(1, { marksOnGun: 1 })], catalog: [entry(1, 10)] });

    const [item] = (await service.marks(42n)).items;

    expect(item).toMatchObject({ marksOnGun: 1, moePercent: null, movingDamage: null, updatedAt: UPDATED_AT.toISOString() });
  });

  it('clamps the mod-reported percent to the MoE maximum', async () => {
    const service = createService({ tanks: [tank(1, modReported({ moePercent: 104 }))], catalog: [entry(1, 10)] });

    const [item] = (await service.marks(42n)).items;

    expect(item?.moePercent).toBe(100);
  });

  it('computes the damage still missing for the next mark from the thresholds', async () => {
    const service = createService({
      tanks: [tank(1, modReported({ marksOnGun: 1, moePercent: 70, moeMovingDamage: 2300 }))],
      catalog: [entry(1, 10)],
      thresholds: [threshold(1)]
    });

    const [item] = (await service.marks(42n)).items;

    expect(item?.nextMarkPercent).toBe(85);
    expect(item?.damageToNextMark).toBe(2500 - 2300);
  });

  it('leaves the next-mark damage unknown without thresholds', async () => {
    const service = createService({ tanks: [tank(1, modReported({ moePercent: 50, moeMovingDamage: 1800 }))], catalog: [entry(1, 10)] });

    const [item] = (await service.marks(42n)).items;

    expect(item?.thresholds).toBeNull();
    expect(item?.damageToNextMark).toBeNull();
  });

  it('takes combined damage from recent battles before the rating average', async () => {
    const service = createService({
      tanks: [tank(1), tank(2), tank(3)],
      catalog: [entry(1, 10), entry(2, 10), entry(3, 10)],
      combined: [{ tank_id: 1, battles: 50, combined: 3100 }],
      ratings: [mock<AccountTankRating>({ tankId: 1, avgDamage: 2000 }), mock<AccountTankRating>({ tankId: 2, avgDamage: 1900 })]
    });

    const byTank = new Map((await service.marks(42n)).items.map((item) => [item.vehicle.tankId, item]));

    expect(byTank.get(1)).toMatchObject({ avgCombinedDamage: 3100, combinedDamageSource: 'battles' });
    expect(byTank.get(2)).toMatchObject({ avgCombinedDamage: 1900, combinedDamageSource: 'damage' });
    expect(byTank.get(3)).toMatchObject({ avgCombinedDamage: null, combinedDamageSource: null });
  });

  it('puts the tanks closest to their next mark first', async () => {
    const service = createService({
      tanks: [
        tank(1, modReported({ moePercent: 70, moeMovingDamage: 2000 })),
        tank(2, modReported({ moePercent: 70, moeMovingDamage: 2400 })),
        tank(3)
      ],
      catalog: [entry(1, 10), entry(2, 10), entry(3, 10)],
      thresholds: [threshold(1), threshold(2)]
    });

    const { items } = await service.marks(42n);

    expect(items.map((item) => item.vehicle.tankId)).toEqual([2, 1, 3]);
  });
});
