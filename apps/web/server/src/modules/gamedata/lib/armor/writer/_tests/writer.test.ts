import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaClient, VehicleArmorModel } from '../../../../../../../generated';
import type { CollectedArmorModels } from '../../collect/collect.types';
import type { ArmorStorage } from '../../storage/storage.types';

import { armorStorageKey } from '../../pack/pack';
import { purgeArmorModels, writeArmorModels } from '../writer';

const MODULES = { hull: { piece: 'Hull', plates: [] }, chassis: [], turrets: [] };

const collected: CollectedArmorModels = {
  version: '1.45.0.5231',
  sourceSha: 'b'.repeat(40),
  skipped: [],
  mismatches: [],
  models: [
    { tankId: 1, tag: 'A', bytes: new Uint8Array([1]), hash: 'same', modules: MODULES },
    { tankId: 2, tag: 'B', bytes: new Uint8Array([2]), hash: 'new', modules: MODULES },
    { tankId: 3, tag: 'C', bytes: new Uint8Array([3]), hash: 'first', modules: MODULES }
  ]
};

const createStorage = () => ({ put: vi.fn<ArmorStorage['put']>(), get: vi.fn<ArmorStorage['get']>(), remove: vi.fn<ArmorStorage['remove']>() });

describe('writeArmorModels', () => {
  it('uploads only new or changed geometry and removes the object it replaced', async () => {
    const prisma = mockDeep<PrismaClient>();
    const storage = createStorage();

    prisma.vehicleArmorModel.findMany.mockResolvedValue([
      mock<VehicleArmorModel>({ tankId: 1, hash: 'same', storageKey: 'armor/1/same.bin' }),
      mock<VehicleArmorModel>({ tankId: 2, hash: 'old', storageKey: 'armor/2/old.bin' })
    ]);

    const counts = await writeArmorModels({ prisma, storage, collected });

    expect(counts).toEqual({ uploaded: 2, unchanged: 1, replaced: 1 });

    expect(storage.put.mock.calls.map(([input]) => input.key)).toEqual([
      armorStorageKey({ tankId: 2, hash: 'new' }),
      armorStorageKey({ tankId: 3, hash: 'first' })
    ]);

    expect(storage.remove).toHaveBeenCalledWith('armor/2/old.bin');
    expect(prisma.vehicleArmorModel.upsert).toHaveBeenCalledTimes(collected.models.length);
  });
});

describe('purgeArmorModels', () => {
  it('deletes every stored object and then every row', async () => {
    const prisma = mockDeep<PrismaClient>();
    const storage = createStorage();

    prisma.vehicleArmorModel.findMany.mockResolvedValue([
      mock<VehicleArmorModel>({ storageKey: 'armor/1/a.bin' }),
      mock<VehicleArmorModel>({ storageKey: 'armor/2/b.bin' })
    ]);

    prisma.vehicleArmorModel.deleteMany.mockResolvedValue({ count: 2 });

    expect(await purgeArmorModels({ prisma, storage })).toBe(2);
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });
});
