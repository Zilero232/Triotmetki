import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { VehicleCatalogService } from '../vehicle-catalog.service';

const vehicle = (tankId: number, overrides: Partial<Vehicle> = {}): Vehicle =>
  mock<Vehicle>({
    tankId,
    name: `Tank ${tankId}`,
    shortName: `T${tankId}`,
    slug: `tank-${tankId}`,
    nation: 'ussr',
    type: 'heavyTank',
    tier: 10,
    isPremium: false,
    isCollectible: false,
    images: null,
    specs: null,
    description: null,
    ...overrides
  });

const createService = (rows: Vehicle[]) => {
  const prisma = mockDeep<PrismaService>();

  prisma.vehicle.findMany.mockResolvedValue(rows);
  prisma.premiumOffer.findMany.mockResolvedValue([]);

  return { service: new VehicleCatalogService(prisma), prisma };
};

describe('VehicleCatalogService', () => {
  it('loads the catalog once and serves later calls from the cache', async () => {
    const { service, prisma } = createService([vehicle(1)]);

    await service.all();
    await service.summary(1);

    expect(prisma.vehicle.findMany).toHaveBeenCalledOnce();
  });

  it('does not cache an empty catalog so a later import shows up', async () => {
    const { service, prisma } = createService([]);

    await expect(service.all()).resolves.toEqual(new Map());

    prisma.vehicle.findMany.mockResolvedValue([vehicle(1)]);

    expect((await service.all()).size).toBe(1);
  });

  it('answers a placeholder summary for an unknown tank and null from find', async () => {
    const { service } = createService([vehicle(1)]);

    expect((await service.summary(99)).name).toBe('#99');
    await expect(service.find(99)).resolves.toBeNull();
  });

  it('finds a tank by slug', async () => {
    const { service } = createService([vehicle(1), vehicle(2)]);

    expect((await service.bySlug('tank-2'))?.summary.tankId).toBe(2);
    await expect(service.bySlug('missing')).resolves.toBeNull();
  });

  it('maps tank ids to tiers', async () => {
    const { service } = createService([vehicle(1, { tier: 6 }), vehicle(2, { tier: 8 })]);

    expect(await service.tiers()).toEqual(
      new Map([
        [1, 6],
        [2, 8]
      ])
    );
  });

  it('filters the catalog', async () => {
    const { service } = createService([vehicle(1, { tier: 6 }), vehicle(2, { tier: 8 })]);

    const entries = await service.filter({ tiers: [8] });

    expect(entries.map((entry) => entry.summary.tankId)).toEqual([2]);
  });

  it('classifies a hidden premium as a shop premium once our offer history saw it, and as a reward otherwise', async () => {
    const hidden = { isPremium: true, specs: { tags: [], role: 'role_HT_break', notInShop: true } };
    const { service, prisma } = createService([vehicle(1, hidden), vehicle(2, hidden)]);

    prisma.premiumOffer.findMany.mockResolvedValue([mock({ tankIds: [1] })]);

    const entries = await service.all();

    expect(entries.get(1)?.summary.status).toBe('premium');
    expect(entries.get(2)?.summary.status).toBe('reward');
    expect(entries.get(2)?.role).toBe('HT_break');
  });

  it('filters by status and role', async () => {
    const { service } = createService([vehicle(1), vehicle(2, { isCollectible: true, specs: { role: 'role_MT_sniper' } })]);

    expect((await service.filter({ statuses: ['collector'] })).map((entry) => entry.summary.tankId)).toEqual([2]);
    expect((await service.filter({ roles: ['MT_sniper'] })).map((entry) => entry.summary.tankId)).toEqual([2]);
  });
});
