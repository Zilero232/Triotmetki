import { base64ToBytes } from '@otmetki/gamedata';
import { armorModelSchema } from '@otmetki/schemas';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { VehicleArmorModel } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ArmorStorage } from '../../../gamedata';
import type { CatalogEntry, VehicleCatalogService } from '../../../reference';
import type { UsageMeterService } from '../../../usage';
import type { TankDetailReaderService } from '../tank-detail-reader.service';

import { AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { ARMOR_VIEWER } from '../../../../config';
import { StorageObjectMissingError } from '../../../../core';
import { TankArmorReaderService } from '../tank-armor-reader.service';

const SUMMARY = {
  tankId: 7169,
  name: 'IS-7',
  shortName: 'IS-7',
  slug: 'is-7',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
} as const;

const ROW: VehicleArmorModel = {
  tankId: SUMMARY.tankId,
  gameVersion: '1.45.0.5231',
  storageKey: 'armor/7169/abc.bin',
  hash: 'abc',
  bytes: 3,
  modules: { hull: { piece: 'Hull', plates: [{ name: 'armor_1', thickness: 150, flags: 0 }] }, chassis: [], turrets: [] },
  sourceSha: 'b'.repeat(40),
  updatedAt: new Date('2026-09-25T00:00:00Z')
};

const ACTOR = { userId: 'user-1', deviceId: null, ipHash: null };

const createService = ({ row, stored, readError }: { row: VehicleArmorModel | null; stored?: Uint8Array; readError?: Error }) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const details = mock<TankDetailReaderService>();
  const usage = mock<UsageMeterService>();

  const storage: ArmorStorage = {
    put: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(async () => {
      if (!stored) {
        throw readError ?? new StorageObjectMissingError(ROW.storageKey);
      }

      return stored;
    })
  };

  prisma.vehicleArmorModel.findUnique.mockResolvedValue(row);
  catalog.find.mockResolvedValue(mock<CatalogEntry>({ summary: SUMMARY }));
  details.resolve.mockResolvedValue(SUMMARY.tankId);

  return { service: new TankArmorReaderService(prisma, catalog, details, usage, storage), usage, prisma };
};

describe('TankArmorReaderService', () => {
  it('returns the stored geometry as base64 with the plate tables and the mirror commit', async () => {
    const stored = new Uint8Array([66, 82, 65]);
    const response = await createService({ row: ROW, stored }).service.armor(SUMMARY.tankId);

    expect(armorModelSchema.safeParse(response).success).toBe(true);
    expect([...base64ToBytes(response.geometry)]).toEqual([...stored]);
    expect(response.source.commit).toBe(ROW.sourceSha);
    expect(response.source.client).toBe('MT.RU.PRODUCTION');
    expect(response.modules.hull.plates[0].thickness).toBe(150);
  });

  it('is a not-found when the tank has no armor model', async () => {
    await expect(createService({ row: null }).service.armor(SUMMARY.tankId)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('is a not-found when the row exists but the stored object is gone', async () => {
    await expect(createService({ row: ROW }).service.armor(SUMMARY.tankId)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('surfaces a storage outage as the failure it is, not as a missing model', async () => {
    const outage = new Error('connect ETIMEDOUT');

    await expect(createService({ row: ROW, readError: outage }).service.armor(SUMMARY.tankId)).rejects.toBe(outage);
  });

  it('loads a tank once for concurrent requests', async () => {
    const { service, prisma } = createService({ row: ROW, stored: new Uint8Array([1]) });

    await Promise.all([service.armor(SUMMARY.tankId), service.armor(SUMMARY.tankId), service.armor(SUMMARY.tankId)]);

    expect(prisma.vehicleArmorModel.findUnique).toHaveBeenCalledTimes(1);
  });

  it('does not remember a failed load', async () => {
    const { service, prisma } = createService({ row: null });

    await service.armor(SUMMARY.tankId).catch(() => null);
    await service.armor(SUMMARY.tankId).catch(() => null);

    expect(prisma.vehicleArmorModel.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe('TankArmorReaderService.open', () => {
  const STORED = new Uint8Array([66, 82, 65]);

  it('counts one armor view against the resolved tank, not the slug it was asked by', async () => {
    const { service, usage } = createService({ row: ROW, stored: STORED });

    await service.open({ idOrSlug: SUMMARY.slug, actor: ACTOR });

    expect(usage.consume).toHaveBeenCalledWith({ meter: ARMOR_VIEWER.meter, actor: ACTOR, subject: String(SUMMARY.tankId) });
  });

  it('does not count a view of a tank that has no armor model', async () => {
    const { service, usage } = createService({ row: null });

    await expect(service.open({ idOrSlug: SUMMARY.slug, actor: ACTOR })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(usage.consume).not.toHaveBeenCalled();
  });

  it('withholds the geometry once the allowance is used up', async () => {
    const { service, usage } = createService({ row: ROW, stored: STORED });

    usage.consume.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'used up', { feature: 'armor3d' }));

    await expect(service.open({ idOrSlug: SUMMARY.slug, actor: ACTOR })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('reads the stored geometry once for repeated opens of the same tank', async () => {
    const { service, prisma } = createService({ row: ROW, stored: STORED });

    await service.open({ idOrSlug: SUMMARY.slug, actor: ACTOR });
    await service.open({ idOrSlug: SUMMARY.slug, actor: ACTOR });

    expect(prisma.vehicleArmorModel.findUnique).toHaveBeenCalledTimes(1);
  });
});
