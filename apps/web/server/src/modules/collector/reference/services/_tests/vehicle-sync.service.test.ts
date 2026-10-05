import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../../core';
import type { Vehicle } from '../../../../../lib/lesta';
import type { ReferenceQueries } from '../../providers/reference-queries.types';

import { Prisma } from '../../../../../../generated';
import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { REFERENCE } from '../../config/reference.constants';
import { referenceQueries } from '../../providers/reference-queries.provider';
import { VehicleSyncService } from '../vehicle-sync.service';

const GAME_VERSION_ID = 3;

const vehicle = (fields: Partial<Vehicle> = {}): Vehicle => ({
  tank_id: 1,
  name: 'T-34',
  tier: 5,
  type: 'mediumTank',
  nation: 'ussr',
  tag: 'R04_T-34',
  is_premium: false,
  default_profile: { profile_id: 'p1', modules: { gun_id: 10, engine_id: 20 } },
  ...fields
});

type LatestSpecs = Awaited<ReturnType<ReferenceQueries['latestSpecHistory']>>;

const createSync = (vehicles: Record<string, Vehicle | null>, latestSpecs: LatestSpecs = []) => {
  const prisma = mockPrismaService();
  const clients = mockDeep<LestaClients>();
  const queries: ReferenceQueries = { ...referenceQueries, latestSpecHistory: async () => latestSpecs };

  clients.bulk.encyclopedia.allVehicles.mockResolvedValue(vehicles);

  return { prisma, clients, service: new VehicleSyncService(prisma, clients, queries) };
};

describe('VehicleSyncService.sync', () => {
  it('keeps every stored vehicle active when Lesta returns an empty catalogue', async () => {
    const { prisma, service } = createSync({});

    expect(await service.sync(GAME_VERSION_ID)).toBe(0);
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('keeps the catalogue untouched when the Lesta request fails', async () => {
    const { prisma, clients, service } = createSync({});

    clients.bulk.encyclopedia.allVehicles.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));

    await expect(service.sync(GAME_VERSION_ID)).rejects.toThrow();
    expect(prisma.vehicle.upsert).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('retires only vehicles missing from a non-empty catalogue', async () => {
    const { prisma, service } = createSync({ 1: vehicle(), 2: null });

    expect(await service.sync(GAME_VERSION_ID)).toBe(1);
    expect(prisma.vehicle.updateMany.mock.calls[0]?.[0]).toMatchObject({ where: { tankId: { notIn: [1] } }, data: { isActive: false } });
  });

  it('skips a vehicle of an unknown type', async () => {
    const { prisma, service } = createSync({ 1: vehicle({ type: 'hovercraft' }) });

    expect(await service.sync(GAME_VERSION_ID)).toBe(0);
    expect(prisma.vehicle.upsert).not.toHaveBeenCalled();
  });

  it('falls back to the name when a vehicle has no short name and derives images from its tag', async () => {
    const { prisma, service } = createSync({ 1: vehicle({ short_name: null, images: null }) });

    await service.sync(GAME_VERSION_ID);

    const [upsert] = prisma.vehicle.upsert.mock.calls[0] ?? [];

    expect(upsert?.create).toMatchObject({ shortName: 'T-34', isActive: true, isGift: false });
    expect(upsert?.update).toHaveProperty('images');
  });

  it('keeps stored images when neither Lesta nor the tag gives any', async () => {
    const { prisma, service } = createSync({ 1: vehicle({ tag: null, images: null }) });

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicle.upsert.mock.calls[0]?.[0].update).not.toHaveProperty('images');
    expect(prisma.vehicle.upsert.mock.calls[0]?.[0].create).toMatchObject({ slug: 'tank-1' });
  });

  it('stores the default profile with only its numeric module ids', async () => {
    const { prisma, service } = createSync({ 1: vehicle() });

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicleProfile.upsert.mock.calls[0]?.[0].create).toMatchObject({ profileId: 'p1', isDefault: true, moduleIds: [10, 20] });
  });

  it('uses the default profile id when Lesta omits it', async () => {
    const { prisma, service } = createSync({ 1: vehicle({ default_profile: { modules: {} } }) });

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicleProfile.upsert.mock.calls[0]?.[0].create).toMatchObject({ profileId: REFERENCE.defaultProfileId, moduleIds: [] });
  });

  it('writes no profile for a vehicle without one', async () => {
    const { prisma, service } = createSync({ 1: vehicle({ default_profile: null }) });

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicleProfile.upsert).not.toHaveBeenCalled();
  });

  it('diffs the specs against the latest spec of an earlier game version', async () => {
    const { prisma, service } = createSync({ 1: vehicle() }, [{ tankId: 1, specs: { profile_id: 'p1', modules: { gun_id: 9 } } }]);

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicleSpecHistory.upsert.mock.calls[0]?.[0].create.diff).not.toBe(Prisma.JsonNull);
  });

  it('stores no diff when the specs match the earlier game version', async () => {
    const { prisma, service } = createSync({ 1: vehicle() }, [{ tankId: 1, specs: vehicle().default_profile }]);

    await service.sync(GAME_VERSION_ID);

    expect(prisma.vehicleSpecHistory.upsert.mock.calls[0]?.[0].create.diff).toBe(Prisma.JsonNull);
  });
});
