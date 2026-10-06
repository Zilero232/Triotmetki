import type { ModSettingsExport, SettingsValues } from '@otmetki/schemas';

import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlayerSettingsShare, SettingsApplyRequest, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { AuthenticatedDevice } from '../../../../mod';
import type { StreamerProfileWriterService } from '../../../profiles';
import type { StreamerSettingsReaderService } from '../streamer-settings-reader.service';
import type { StreamerSettingsWriterService } from '../streamer-settings-writer.service';

import { AppBadRequestException, AppNotFoundException } from '../../../../../common/exceptions';
import { SETTINGS_APPLY } from '../../config/settings-apply.constants';
import { SettingsShareWriterService } from '../settings-share-writer.service';

const NOW = new Date('2026-09-20T12:00:00Z');

const device: AuthenticatedDevice = {
  id: 'device-1',
  userId: 'u1',
  accountId: 1001n,
  name: null,
  secretHash: 'hash',
  modVersion: null,
  gameVersion: null,
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: NOW
};

const streamerValues: SettingsValues = {
  camera: { fov: 95 },
  zoom: { steps: ['x2', 'x8', 'x16'] }
};

const applyRow = (overrides: Partial<SettingsApplyRequest> = {}): SettingsApplyRequest => ({
  id: 'req-1',
  userId: 'u1',
  deviceId: null,
  profileId: 'p1',
  groups: ['camera'],
  data: { camera: { fov: 95 } },
  status: 'pending',
  createdAt: NOW,
  appliedAt: null,
  ...overrides
});

const shareRow = (overrides: Partial<PlayerSettingsShare> = {}): PlayerSettingsShare => ({
  userId: 'u1',
  accountId: 1001n,
  data: { camera: { fov: 90 } },
  anonymousStats: false,
  updatedAt: NOW,
  ...overrides
});

const exportBody = (overrides: Partial<ModSettingsExport> = {}): ModSettingsExport => ({
  device_id: '8c6f7b2e-3a1d-4c7e-9f0a-1b2c3d4e5f60',
  account_id: 1001,
  mod_version: '1.0.0',
  target: 'private',
  anonymous_stats: true,
  settings: { camera: { fov: 100 } },
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const profiles = mock<StreamerProfileWriterService>();
  const settings = mock<StreamerSettingsReaderService>();
  const writer = mock<StreamerSettingsWriterService>();

  profiles.publicBySlug.mockResolvedValue(mock<StreamerProfile>({ id: 'p1', slug: 'jove' }));

  return { service: new SettingsShareWriterService(prisma, profiles, settings, writer), prisma, settings, writer };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SettingsShareWriterService.requestApply', () => {
  it('refuses a streamer who has no settings', async () => {
    const { service, settings } = createService();

    settings.valuesOf.mockResolvedValue(null);

    await expect(service.requestApply({ userId: 'u1', slug: 'jove', groups: ['camera'] })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('refuses when none of the chosen groups has values', async () => {
    const { service, settings, prisma } = createService();

    settings.valuesOf.mockResolvedValue(streamerValues);

    await expect(service.requestApply({ userId: 'u1', slug: 'jove', groups: ['sound', 'minimap'] })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.settingsApplyRequest.create).not.toHaveBeenCalled();
  });

  it('stores only the chosen groups that have values and expires the previous pending request', async () => {
    const { service, settings, prisma } = createService();

    settings.valuesOf.mockResolvedValue(streamerValues);
    prisma.settingsApplyRequest.create.mockResolvedValue(applyRow({ groups: ['camera'] }));

    const view = await service.requestApply({ userId: 'u1', slug: 'jove', groups: ['camera', 'sound'] });

    expect(prisma.settingsApplyRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', status: 'pending' },
        data: { status: 'expired' }
      })
    );

    expect(prisma.settingsApplyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', profileId: 'p1', deviceId: null, groups: ['camera'], data: { camera: streamerValues.camera } })
      })
    );

    expect(view).toMatchObject({ id: 'req-1', slug: 'jove', groups: ['camera'], status: 'pending', appliedAt: null });
  });

  it('binds the request to the chosen device', async () => {
    const { service, settings, prisma } = createService();

    settings.valuesOf.mockResolvedValue(streamerValues);
    prisma.settingsApplyRequest.create.mockResolvedValue(applyRow({ deviceId: device.id }));

    await service.requestApply({ userId: 'u1', slug: 'jove', groups: ['camera'], deviceId: device.id });

    expect(prisma.settingsApplyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deviceId: device.id }) })
    );
  });
});

describe('SettingsShareWriterService.myRequests', () => {
  it('names each request by its streamer slug and drops groups the mod cannot apply', async () => {
    const { service, prisma } = createService();
    const rows = [{ ...applyRow({ groups: ['camera', 'hardware'], status: 'applied', appliedAt: NOW }), profile: { slug: 'jove' } }];

    prisma.settingsApplyRequest.findMany.mockResolvedValue(rows);

    const [request] = await service.myRequests('u1');

    expect(request).toEqual({
      id: 'req-1',
      slug: 'jove',
      groups: ['camera'],
      status: 'applied',
      createdAt: NOW.toISOString(),
      appliedAt: NOW.toISOString()
    });

    expect(prisma.settingsApplyRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: SETTINGS_APPLY.historyLimit }));
  });
});

describe('SettingsShareWriterService.share', () => {
  it('returns null when the user never shared settings', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.findUnique.mockResolvedValue(null);

    expect(await service.share('u1')).toBeNull();
  });

  it('returns the stored values with the anonymous flag', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.findUnique.mockResolvedValue(shareRow({ anonymousStats: true }));

    expect(await service.share('u1')).toEqual({ anonymousStats: true, values: { camera: { fov: 90 } }, updatedAt: NOW.toISOString() });
  });

  it('returns empty values when the stored data no longer matches the schema', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.findUnique.mockResolvedValue(shareRow({ data: { camera: { fov: 'wide' } } }));

    expect(await service.share('u1')).toMatchObject({ values: {} });
  });
});

describe('SettingsShareWriterService.setAnonymous', () => {
  it('refuses when the user has not shared settings from the mod', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.setAnonymous({ userId: 'u1', anonymousStats: true })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('returns the share with the updated flag', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.updateMany.mockResolvedValue({ count: 1 });
    prisma.playerSettingsShare.findUnique.mockResolvedValue(shareRow({ anonymousStats: true }));

    expect(await service.setAnonymous({ userId: 'u1', anonymousStats: true })).toMatchObject({ anonymousStats: true });
  });
});

describe('SettingsShareWriterService.ingestExport', () => {
  it('keeps a private export out of the streamer settings', async () => {
    const { service, prisma, writer } = createService();

    await service.ingestExport({ device, body: exportBody() });

    expect(writer.save).not.toHaveBeenCalled();

    expect(prisma.playerSettingsShare.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: device.userId },
        create: expect.objectContaining({ accountId: device.accountId, data: { camera: { fov: 100 } }, anonymousStats: true })
      })
    );
  });

  it('refuses a profile export from a user without a streamer profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(null);

    await expect(service.ingestExport({ device, body: exportBody({ target: 'profile' }) })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.playerSettingsShare.upsert).not.toHaveBeenCalled();
  });

  it('merges a profile export over the groups the streamer already has', async () => {
    const { service, prisma, settings, writer } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ id: 'p1' }));
    settings.valuesOf.mockResolvedValue(streamerValues);

    await service.ingestExport({ device, body: exportBody({ target: 'profile' }) });

    expect(writer.save).toHaveBeenCalledWith({
      profileId: 'p1',
      userId: device.userId,
      source: 'mod',
      values: { camera: { fov: 100 }, zoom: streamerValues.zoom }
    });

    expect(prisma.playerSettingsShare.upsert).toHaveBeenCalled();
  });
});

describe('SettingsShareWriterService.pendingForDevice', () => {
  it('expires pending requests older than the apply window', async () => {
    const { service, prisma } = createService();

    prisma.settingsApplyRequest.findMany.mockResolvedValue([]);

    await service.pendingForDevice(device);

    expect(prisma.settingsApplyRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: device.userId, status: 'pending', createdAt: { lt: subDays(NOW, SETTINGS_APPLY.expireDays) } }),
        data: { status: 'expired' }
      })
    );
  });

  it('hands the mod valid requests and skips ones whose data is broken', async () => {
    const { service, prisma } = createService();
    const rows = [
      { ...applyRow({ id: 'good', groups: ['camera', 'mods'] }), profile: { slug: 'jove' } },
      { ...applyRow({ id: 'broken', data: { camera: { fov: 'wide' } } }), profile: { slug: 'nidin' } }
    ];

    prisma.settingsApplyRequest.findMany.mockResolvedValue(rows);

    expect(await service.pendingForDevice(device)).toEqual({
      requests: [{ id: 'good', profile_slug: 'jove', groups: ['camera'], settings: { camera: { fov: 95 } } }]
    });
  });
});

describe('SettingsShareWriterService.applyResult', () => {
  it('stamps the apply time only for an applied request', async () => {
    const { service, prisma } = createService();

    prisma.settingsApplyRequest.updateMany.mockResolvedValue({ count: 1 });

    await service.applyResult({ device, id: 'req-1', status: 'applied' });
    await service.applyResult({ device, id: 'req-2', status: 'rejected' });

    const [applied, rejected] = prisma.settingsApplyRequest.updateMany.mock.calls.map(([args]) => args.data);

    expect(applied).toMatchObject({ status: 'applied', deviceId: device.id, appliedAt: NOW });
    expect(rejected).toMatchObject({ status: 'rejected', appliedAt: null });
  });

  it('refuses a request that is not pending for this user', async () => {
    const { service, prisma } = createService();

    prisma.settingsApplyRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.applyResult({ device, id: 'req-1', status: 'applied' })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
