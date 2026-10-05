import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Prisma, StreamerSettingsVersion } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { StreamerProfileService } from '../../../profiles';

import { AppNotFoundException } from '../../../../../common/exceptions';
import { streamerProfileRow } from '../../../profiles/services/_tests/streamers.fixtures';
import { StreamerSettingsService } from '../streamer-settings.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const ZOOM_SOURCE = 'https://example.com/zoom-settings';

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  const profiles = mock<StreamerProfileService>();

  return { service: new StreamerSettingsService(prisma, profiles), prisma, profiles };
};

const stored = (settings: Prisma.JsonObject | null) => streamerProfileRow({ settings });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamerSettingsService.save', () => {
  it('stamps changed groups with the new source and keeps provenance of unchanged ones', async () => {
    const { service, prisma } = createService();
    const oldCamera = { fov: 95, source: 'editorial', sourceUrl: 'https://nidin.ru/game-settings', checkedAt: '2026-08-01T00:00:00.000Z' };

    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(stored({ camera: oldCamera }));

    await service.save({ profileId: 'p1', userId: 'u1', source: 'creator', values: { camera: { fov: 95 }, zoom: { steps: ['x2', 'x16'] } } });

    const [call] = prisma.streamerSettingsVersion.create.mock.calls;

    expect(call?.[0].data.data).toEqual({
      camera: oldCamera,
      zoom: { steps: ['x2', 'x16'], source: 'creator', sourceUrl: null, checkedAt: NOW.toISOString() }
    });

    expect(call?.[0].data.changedGroups).toEqual(['zoom']);
  });

  it('records where each changed group was taken from', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(stored(null));

    await service.save({
      profileId: 'p1',
      userId: 'u1',
      source: 'editorial',
      values: { zoom: { steps: ['x2'] } },
      sourceUrls: { zoom: ZOOM_SOURCE }
    });

    expect(prisma.streamerSettingsVersion.create.mock.calls[0]?.[0].data.data).toMatchObject({
      zoom: { source: 'editorial', sourceUrl: ZOOM_SOURCE, checkedAt: NOW.toISOString() }
    });
  });

  it('writes nothing when no group changed', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(
      stored({ camera: { fov: 90, source: 'creator', sourceUrl: null, checkedAt: '2026-08-01T00:00:00.000Z' } })
    );

    await service.save({ profileId: 'p1', userId: 'u1', source: 'creator', values: { camera: { fov: 90 } } });

    expect(prisma.streamerSettingsVersion.create).not.toHaveBeenCalled();
  });
});

describe('StreamerSettingsService.table', () => {
  it('lists profiles with settings, newest settings first, dated by the settings change', async () => {
    const { service, prisma } = createService();
    const settingsUpdatedAt = new Date('2026-09-10T00:00:00Z');

    prisma.streamerProfile.findMany.mockResolvedValue([
      streamerProfileRow({
        isLive: true,
        settings: { mods: { kind: 'modpack', source: 'creator', sourceUrl: null, checkedAt: '2026-08-01T00:00:00.000Z' } },
        settingsUpdatedAt
      }),
      streamerProfileRow({ slug: 'broken', settings: { camera: { fov: 'wide' } }, settingsUpdatedAt })
    ]);

    const rows = await service.table();
    const [query] = prisma.streamerProfile.findMany.mock.calls.map(([args]) => args);

    expect(query?.orderBy).toEqual({ settingsUpdatedAt: { sort: 'desc', nulls: 'last' } });
    expect(rows).toEqual([expect.objectContaining({ slug: 'jove', modsKind: 'modpack', updatedAt: settingsUpdatedAt.toISOString() })]);
    expect(rows[0]).not.toHaveProperty('modpack');
  });
});

describe('StreamerSettingsService.save for a first submission', () => {
  it('writes a version even when the first submission carries no groups', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(stored(null));

    await service.save({ profileId: 'p1', userId: 'u1', source: 'creator', values: {} });

    expect(prisma.streamerSettingsVersion.create).toHaveBeenCalledWith({
      data: { profileId: 'p1', data: {}, source: 'creator', changedGroups: [], createdBy: 'u1' }
    });

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { settings: {}, settingsUpdatedAt: NOW } });
  });
});

describe('StreamerSettingsService.mine', () => {
  it('refuses a user without a streamer profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(null);

    await expect(service.mine('u1')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('shows an empty settings object and no date before the first save', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(streamerProfileRow());

    expect(await service.mine('u1')).toEqual({ slug: 'jove', displayName: 'Jove', kind: 'claimed', settings: {}, updatedAt: null });
  });
});

describe('StreamerSettingsService.saveMine', () => {
  it('refuses a user without a streamer profile and writes nothing', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(null);

    await expect(service.saveMine({ userId: 'u1', source: 'creator', values: { camera: { fov: 90 } } })).rejects.toBeInstanceOf(AppNotFoundException);

    expect(prisma.streamerSettingsVersion.create).not.toHaveBeenCalled();
  });

  it('saves under the user’s own profile and returns the fresh view', async () => {
    const { service, prisma } = createService();
    const camera = { fov: 90, source: 'creator', sourceUrl: null, checkedAt: NOW.toISOString() };

    prisma.streamerProfile.findUnique
      .mockResolvedValueOnce(streamerProfileRow({ id: 'own-profile' }))
      .mockResolvedValueOnce(streamerProfileRow({ id: 'own-profile', settings: { camera }, settingsUpdatedAt: NOW }));

    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(stored(null));

    const view = await service.saveMine({ userId: 'u1', source: 'creator', values: { camera: { fov: 90 } } });

    expect(prisma.streamerProfile.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'own-profile' } }));
    expect(view).toMatchObject({ settings: { camera }, updatedAt: NOW.toISOString() });
  });
});

describe('StreamerSettingsService.history', () => {
  const version = (overrides: Partial<StreamerSettingsVersion>): StreamerSettingsVersion => ({
    id: 'v1',
    profileId: 'p1',
    data: {},
    source: 'creator',
    changedGroups: [],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides
  });

  it('lists the latest versions and drops groups the schema no longer knows', async () => {
    const { service, prisma, profiles } = createService();

    profiles.publicBySlug.mockResolvedValue(streamerProfileRow());
    prisma.streamerSettingsVersion.findMany.mockResolvedValue([version({ id: 'v2', source: 'editorial', changedGroups: ['camera', 'retired'] })]);

    expect(await service.history('jove')).toEqual([{ id: 'v2', source: 'editorial', changedGroups: ['camera'], createdAt: NOW.toISOString() }]);

    expect(prisma.streamerSettingsVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: 'p1' }, orderBy: { createdAt: 'desc' } })
    );
  });
});

describe('StreamerSettingsService.valuesOf', () => {
  it('returns null for a profile without settings', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(stored(null));

    expect(await service.valuesOf('p1')).toBeNull();
  });

  it('strips the provenance and keeps only the values', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(
      stored({ camera: { fov: 90, source: 'creator', sourceUrl: null, checkedAt: '2026-08-01T00:00:00.000Z' } })
    );

    expect(await service.valuesOf('p1')).toEqual({ camera: { fov: 90 } });
  });
});

describe('StreamerSettingsService.table filtering', () => {
  it('skips a profile whose settings were never dated', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      streamerProfileRow({ settings: { camera: { fov: 90, source: 'creator', sourceUrl: null, checkedAt: '2026-08-01T00:00:00.000Z' } } })
    ]);

    expect(await service.table()).toEqual([]);
  });
});

describe('StreamerSettingsService.compare', () => {
  it('keeps the order the slugs were asked in', async () => {
    const { service, profiles } = createService();

    profiles.publicBySlug.mockImplementation(async (slug) => streamerProfileRow({ slug }));

    expect((await service.compare(['b', 'a'])).map(({ slug }) => slug)).toEqual(['b', 'a']);
  });
});
