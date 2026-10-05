import { playerTanksQuerySchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountTankRating, PlayerTank, TankSnapshotLatest } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { CatalogEntry } from '../../../reference/reference.types';
import type { LatestTankSnapshot } from '../../selects';

import { unknownVehicle } from '../../../reference';
import { PLAYER_STATS } from '../../config';
import { PlayerTanksReaderService } from '../player-tanks-reader.service';

const entry = (tankId: number, tier = 10): CatalogEntry => ({
  summary: { ...unknownVehicle(tankId), tier },
  dbType: 'heavyTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const tank = (tankId: number, overrides: Partial<PlayerTank> = {}): PlayerTank =>
  mock<PlayerTank>({ tankId, battles: 100, wins: 50, markOfMastery: 0, marksOnGun: null, moePercent: null, lastBattleAt: null, ...overrides });

const snapshot = (tankId: number, overrides: Partial<LatestTankSnapshot> = {}): LatestTankSnapshot => ({
  tankId,
  battles: 200,
  wins: 120,
  damageDealt: 400_000,
  frags: 200,
  xp: 100_000,
  survived: 50,
  maxFrags: 6,
  maxXp: 2500,
  ...overrides
});

const createService = ({
  tanks = [tank(1)],
  snapshots = [],
  catalog = [entry(1)]
}: {
  tanks?: PlayerTank[];
  snapshots?: LatestTankSnapshot[];
  catalog?: CatalogEntry[];
}) => {
  const prisma = mockDeep<PrismaService>();
  const vehicles = mock<VehicleCatalogService>();

  prisma.playerTank.findMany.mockResolvedValue(tanks);
  prisma.tankSnapshotLatest.findMany.mockResolvedValue(snapshots.map((row) => Object.assign(mock<TankSnapshotLatest>(), row)));
  prisma.accountTankRating.findMany.mockResolvedValue([]);
  vehicles.filter.mockResolvedValue(catalog);

  vehicles.summary.mockImplementation((tankId) =>
    Promise.resolve(catalog.find((item) => item.summary.tankId === tankId)?.summary ?? unknownVehicle(tankId))
  );

  return { service: new PlayerTanksReaderService(prisma, vehicles), prisma };
};

const query = (input: Record<string, string> = {}) => playerTanksQuerySchema.parse(input);

describe('PlayerTanksReaderService.list', () => {
  it('keeps only tanks that pass the vehicle filter', async () => {
    const { service } = createService({ tanks: [tank(1), tank(2)], catalog: [entry(2)] });

    const { items } = await service.list({ accountId: 42n, query: query() });

    expect(items.map((row) => row.vehicle.tankId)).toEqual([2]);
  });

  it('prefers the latest snapshot over the tank row for battle counts and averages', async () => {
    const { service } = createService({ snapshots: [snapshot(1)] });

    const [row] = (await service.list({ accountId: 42n, query: query() })).items;

    expect(row?.battles).toBe(200);
    expect(row?.winRate).toBeCloseTo(60);
    expect(row?.avgDamage).toBeCloseTo(2000);
    expect(row?.maxFrags).toBe(6);
  });

  it('reads the totals from the latest-snapshot table instead of scanning the snapshot history', async () => {
    const { service, prisma } = createService({ snapshots: [snapshot(1)] });

    await service.list({ accountId: 42n, query: query() });

    expect(prisma.tankSnapshotLatest.findMany.mock.calls[0]?.[0]?.where).toEqual({ accountId: 42n, mode: PLAYER_STATS.snapshotMode });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('falls back to the rating averages without a snapshot', async () => {
    const { service, prisma } = createService({});

    prisma.accountTankRating.findMany.mockResolvedValue([
      mock<AccountTankRating>({ tankId: 1, avgDamage: 1700, avgFrags: 0.8, avgXp: 600, wn8: null, damagePercentile: null })
    ]);

    const [row] = (await service.list({ accountId: 42n, query: query() })).items;

    expect(row).toMatchObject({ battles: 100, avgDamage: 1700, survivalRate: null, maxFrags: null });
    expect(row?.wn8.value).toBeNull();
  });

  it('leaves averages empty with neither a snapshot nor a rating', async () => {
    const { service } = createService({});

    const [row] = (await service.list({ accountId: 42n, query: query() })).items;

    expect(row).toMatchObject({ avgDamage: null, avgFrags: null, avgXp: null, moePercent: null });
  });

  it('clamps MoE progress into 0..100 and mastery into 0..4', async () => {
    const { service } = createService({ tanks: [tank(1, { markOfMastery: 7, marksOnGun: 2, moePercent: 104 })] });

    const [row] = (await service.list({ accountId: 42n, query: query() })).items;

    expect(row).toMatchObject({ moePercent: 100, markOfMastery: 4, marksOnGun: 2 });
  });

  it('sorts by the requested field and direction', async () => {
    const { service } = createService({
      tanks: [tank(1, { battles: 10 }), tank(2, { battles: 30 }), tank(3, { battles: 20 })],
      catalog: [entry(1), entry(2), entry(3)]
    });

    const asc = await service.list({ accountId: 42n, query: query({ sort: 'battles', order: 'asc' }) });
    const desc = await service.list({ accountId: 42n, query: query() });

    expect(asc.items.map((row) => row.battles)).toEqual([10, 20, 30]);
    expect(desc.items.map((row) => row.battles)).toEqual([30, 20, 10]);
  });

  it('returns every tank in one page for limit "all"', async () => {
    const tanks = [tank(1), tank(2), tank(3)];
    const { service } = createService({ tanks, catalog: [entry(1), entry(2), entry(3)] });

    const result = await service.list({ accountId: 42n, query: query({ limit: 'all' }) });

    expect(result.items).toHaveLength(tanks.length);
    expect(result).toMatchObject({ total: tanks.length, offset: 0 });
  });

  it('answers a valid page for a player without tanks', async () => {
    const { service } = createService({ tanks: [], catalog: [] });

    const result = await service.list({ accountId: 42n, query: query({ limit: 'all' }) });

    expect(result.items).toEqual([]);
    expect(result.limit).toBeGreaterThan(0);
  });

  it('adds recent stats only when a period is requested', async () => {
    const { service, prisma } = createService({});
    const rating = mock<AccountTankRating>({
      tankId: 1,
      battles: 12,
      winRate: 50,
      avgDamage: 1500,
      avgFrags: 1,
      avgXp: 500,
      wn8: null,
      computedAt: new Date('2026-09-25T00:00:00.000Z')
    });

    prisma.accountTankRating.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([rating]);

    const [withPeriod] = (await service.list({ accountId: 42n, query: query({ period: '7d' }) })).items;
    const [withoutPeriod] = (await service.list({ accountId: 42n, query: query() })).items;

    expect(withPeriod?.recent).toMatchObject({ period: '7d', stats: { battles: 12 } });
    expect(withoutPeriod?.recent).toBeNull();
  });
});
