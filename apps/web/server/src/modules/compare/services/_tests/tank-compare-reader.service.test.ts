import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { VehicleProfile } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { CatalogEntry } from '../../../reference/reference.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { unknownVehicle } from '../../../reference';
import { COMPARE_PROFILE } from '../../config/compare.constants';
import { TankCompareReaderService } from '../tank-compare-reader.service';

const entry = (tankId: number): CatalogEntry => ({
  summary: unknownVehicle(tankId),
  dbType: 'heavyTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const profile = (tankId: number, profileId: string, overrides: Partial<VehicleProfile> = {}): VehicleProfile =>
  mock<VehicleProfile>({ tankId, profileId, isDefault: false, data: { hp: tankId * 100 }, ...overrides });

const createService = (profiles: VehicleProfile[], known: number[] = [1, 2]) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();

  prisma.vehicleProfile.findMany.mockResolvedValue(profiles);
  catalog.find.mockImplementation((tankId) => Promise.resolve(known.includes(tankId) ? entry(tankId) : null));

  return new TankCompareReaderService(prisma, catalog);
};

describe('TankCompareReaderService.compare', () => {
  it('answers 404 when a tank is not in the catalog', async () => {
    const service = createService([], [1]);

    await expect(service.compare({ tankIds: [1, 99], profiles: undefined })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('uses the profile requested for each position', async () => {
    const service = createService([profile(1, 'stock'), profile(1, COMPARE_PROFILE.preferred), profile(2, 'stock')]);

    const { vehicles } = await service.compare({ tankIds: [1, 2], profiles: ['stock'] });

    expect(vehicles.map((vehicle) => vehicle.profileId)).toEqual(['stock', 'stock']);
  });

  it('falls back to the preferred, then the default, then any profile', async () => {
    const service = createService([
      profile(1, 'stock'),
      profile(1, COMPARE_PROFILE.preferred),
      profile(2, 'custom'),
      profile(2, 'base', { isDefault: true })
    ]);

    const { vehicles } = await service.compare({ tankIds: [1, 2], profiles: undefined });

    expect(vehicles.map((vehicle) => vehicle.profileId)).toEqual([COMPARE_PROFILE.preferred, 'base']);
  });

  it('compares a tank without stored profiles with empty specs', async () => {
    const service = createService([profile(1, 'stock')]);

    const { vehicles } = await service.compare({ tankIds: [1, 2], profiles: undefined });

    expect(vehicles[1]).toMatchObject({ profileId: 'default', specs: {} });
  });

  it('names the tank with the best value of every spec', async () => {
    const service = createService([profile(1, 'stock'), profile(2, 'stock')]);

    const { best } = await service.compare({ tankIds: [1, 2], profiles: undefined });

    expect(best.hp).toBe(2);
  });
});
