import type { TankEconomy, TankLearning, TankObtain } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { VehicleProfile } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SweatIndexReaderService } from '../../../marks';
import type { CatalogEntry, MoeThresholdRecord, ThresholdsReaderService, VehicleCatalogService } from '../../../reference';
import type { TankEconomyReaderService } from '../tank-economy-reader.service';
import type { TankLearningReaderService } from '../tank-learning-reader.service';
import type { TankObtainReaderService } from '../tank-obtain-reader.service';
import type { TopPlayersReaderService } from '../top-players-reader.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { TANK_PROFILES } from '../../config/tanks.constants';
import { TankDetailReaderService } from '../tank-detail-reader.service';
import { catalogEntry, serverStats, vehicle } from './tanks.fixtures';

const profileData = (maxHealth: number) => ({
  modules: { gun: 'gun-1' },
  maxHealth,
  weight: 60,
  enginePower: 1_200,
  powerToWeight: 20,
  speedForward: 50,
  speedBackward: 20,
  hullTraverse: 30,
  turretTraverse: 35,
  viewRange: 400,
  radioRange: 700,
  reloadTime: 8,
  rateOfFire: 7.5,
  aimingTime: 2,
  dispersion: 0.34,
  dispersionMovement: 0.1,
  dispersionHullRotation: 0.1,
  dispersionTurretRotation: 0.05,
  shells: []
});

const profile = (profileId: string, maxHealth: number): VehicleProfile => ({
  tankId: 1,
  profileId,
  isDefault: profileId === TANK_PROFILES.stock,
  moduleIds: [],
  data: profileData(maxHealth),
  updatedAt: new Date('2026-09-20T00:00:00Z')
});

const moe: MoeThresholdRecord = {
  tankId: 1,
  date: new Date('2026-09-20T00:00:00Z'),
  source: 'otmetki',
  p65: 2_000,
  p85: 2_600,
  p95: 3_100,
  p100: null,
  sampleSize: null,
  capturedAt: new Date('2026-09-20T00:00:00Z')
};

const tank = catalogEntry(vehicle({ tankId: 1, slug: 'is-7' }), { armor: 'thick' });

const query = { mode: 'random' as const, period: '30d' as const };

const createService = (entry: CatalogEntry | null = tank) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const thresholds = mock<ThresholdsReaderService>();
  const topPlayers = mock<TopPlayersReaderService>();
  const obtain = mock<TankObtainReaderService>();
  const economy = mock<TankEconomyReaderService>();
  const learning = mock<TankLearningReaderService>();
  const sweat = mock<SweatIndexReaderService>();

  catalog.find.mockResolvedValue(entry);
  catalog.bySlug.mockResolvedValue(entry);
  prisma.tankServerStats.findMany.mockResolvedValue([]);
  prisma.vehicleProfile.findMany.mockResolvedValue([]);
  thresholds.moe.mockResolvedValue(null);
  thresholds.mastery.mockResolvedValue(null);
  topPlayers.top.mockResolvedValue({ tankId: 1, period: 'overall', metric: 'wn8', entries: [] });
  obtain.obtain.mockResolvedValue(mock<TankObtain>());
  economy.forTank.mockResolvedValue(mock<TankEconomy>());
  learning.forTank.mockResolvedValue(mock<TankLearning>());
  sweat.forTank.mockResolvedValue({ moe: null, moeLevel: null, mastery: null, masteryLevel: null });

  return {
    service: new TankDetailReaderService(prisma, catalog, thresholds, topPlayers, obtain, economy, learning, sweat),
    prisma,
    catalog,
    thresholds
  };
};

describe('TankDetailReaderService.resolve', () => {
  it('looks a positive whole number up as a tank id', async () => {
    const { service, catalog } = createService();

    await expect(service.resolve('1')).resolves.toBe(1);
    expect(catalog.bySlug).not.toHaveBeenCalled();
  });

  it('treats anything else as a slug', async () => {
    const { service, catalog } = createService();

    await service.resolve('is-7');
    await service.resolve('0');
    await service.resolve('1.5');

    expect(catalog.bySlug.mock.calls.map(([slug]) => slug)).toEqual(['is-7', '0', '1.5']);
    expect(catalog.find).not.toHaveBeenCalled();
  });

  it('reports an unknown tank as not found', async () => {
    const { service } = createService(null);

    await expect(service.resolve('nope')).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('TankDetailReaderService.detail', () => {
  it('copies object specs and drops anything else', async () => {
    const withSpecs = await createService().service.detail({ idOrSlug: '1', query });
    const withList = await createService(catalogEntry(vehicle({ tankId: 1 }), [1, 2])).service.detail({ idOrSlug: '1', query });

    expect(withSpecs.specs).toEqual({ armor: 'thick' });
    expect(withList.specs).toBeNull();
  });

  it('reads the stock and top profiles separately', async () => {
    const { service, prisma } = createService();

    prisma.vehicleProfile.findMany.mockResolvedValue([profile(TANK_PROFILES.top, 2_000), profile(TANK_PROFILES.stock, 1_700)]);

    const detail = await service.detail({ idOrSlug: '1', query });

    expect(detail.stats.stock?.maxHealth).toBe(1_700);
    expect(detail.stats.top?.maxHealth).toBe(2_000);
  });

  it('leaves missing profiles and thresholds empty', async () => {
    const { service } = createService();

    const detail = await service.detail({ idOrSlug: '1', query });

    expect(detail).toMatchObject({ stats: { stock: null, top: null }, moe: null, mastery: null });
  });

  it('includes the tank thresholds when known', async () => {
    const { service, thresholds } = createService();

    thresholds.moe.mockResolvedValue(moe);

    expect((await service.detail({ idOrSlug: '1', query })).moe).toMatchObject({ p65: 2_000, p95: 3_100 });
  });

  it('labels each server stats row with its own cohort', async () => {
    const { service, prisma } = createService();

    prisma.tankServerStats.findMany.mockResolvedValue([serverStats({ tankId: 1, cohort: 'all' }), serverStats({ tankId: 1, cohort: 'elite' })]);

    const detail = await service.detail({ idOrSlug: 'is-7', query });

    expect(detail.serverStats.map((row) => row.cohort)).toEqual(['all', 'elite']);
    expect(detail.serverStats.every((row) => row.period === query.period && row.mode === query.mode)).toBe(true);
  });

  it('reports an unknown tank as not found', async () => {
    const { service } = createService(null);

    await expect(service.detail({ idOrSlug: '1', query })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
