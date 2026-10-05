import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Prisma, StreamerSettingsVersion } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { StreamerProfileWriterService } from '../../../profiles';

import { AppNotFoundException } from '../../../../../common/exceptions';
import { streamerProfileRow } from '../../../profiles/services/_tests/streamers.fixtures';
import { StreamerSettingsReaderService } from '../streamer-settings-reader.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  const profiles = mock<StreamerProfileWriterService>();

  return { service: new StreamerSettingsReaderService(prisma, profiles), prisma, profiles };
};

const stored = (settings: Prisma.JsonObject | null) => streamerProfileRow({ settings });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamerSettingsReaderService.table', () => {
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

describe('StreamerSettingsReaderService.mine', () => {
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

describe('StreamerSettingsReaderService.history', () => {
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

describe('StreamerSettingsReaderService.valuesOf', () => {
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

describe('StreamerSettingsReaderService.table filtering', () => {
  it('skips a profile whose settings were never dated', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      streamerProfileRow({ settings: { camera: { fov: 90, source: 'creator', sourceUrl: null, checkedAt: '2026-08-01T00:00:00.000Z' } } })
    ]);

    expect(await service.table()).toEqual([]);
  });
});

describe('StreamerSettingsReaderService.compare', () => {
  it('keeps the order the slugs were asked in', async () => {
    const { service, profiles } = createService();

    profiles.publicBySlug.mockImplementation(async (slug) => streamerProfileRow({ slug }));

    expect((await service.compare(['b', 'a'])).map(({ slug }) => slug)).toEqual(['b', 'a']);
  });
});
