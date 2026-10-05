import type { ModComponentSet } from '@otmetki/schemas';
import type { CompiledQuery } from 'kysely';

import { MOD_SYNC } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModSyncLibrary } from '../../../../../generated';

import { advisoryLocks, mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ModSyncWriterService } from '../mod-sync-writer.service';

const NOW = new Date('2026-09-30T12:00:00.000Z');
const USER_ID = 'user';

const set = (id: string, updated = 1_000): ModComponentSet => ({ id, name: `Set ${id}`, components: ['core'], created: 1_000, updated });

const storedRow = (data: object, revision = 3): ModSyncLibrary => ({
  id: 'row',
  userId: USER_ID,
  kind: 'sets',
  data,
  revision,
  updatedAt: new Date('2026-09-01T00:00:00.000Z')
});

const createService = () => {
  const queries: CompiledQuery[] = [];
  const prisma = mockPrismaService({ queries });

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.modSyncLibrary.upsert.mockResolvedValue(storedRow({}, 1));

  return { service: new ModSyncWriterService(prisma), prisma, queries };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ModSyncWriterService.sets', () => {
  it('answers an empty library at revision 0 when the user stored nothing', async () => {
    const { service, prisma } = createService();

    prisma.modSyncLibrary.findUnique.mockResolvedValue(null);

    await expect(service.sets(USER_ID)).resolves.toEqual({ sets: [], deleted: [], revision: 0, updated_at: null });
  });

  it('answers the stored sets with the revision and time of their last change', async () => {
    const { service, prisma } = createService();
    const row = storedRow({ items: [set('a')], deleted: [] });

    prisma.modSyncLibrary.findUnique.mockResolvedValue(row);

    await expect(service.sets(USER_ID)).resolves.toEqual({ sets: [set('a')], deleted: [], revision: 3, updated_at: row.updatedAt.toISOString() });
  });
});

describe('ModSyncWriterService.saveSets', () => {
  it('stores a changed library as the next revision under the per-user lock', async () => {
    const { service, prisma, queries } = createService();

    prisma.modSyncLibrary.findUnique.mockResolvedValue(storedRow({ items: [set('a')], deleted: [] }));

    await service.saveSets({ userId: USER_ID, body: { sets: [set('b')], deleted: [], mode: 'merge' } });

    expect(advisoryLocks(queries)).toHaveLength(1);

    expect(prisma.modSyncLibrary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_kind: { userId: USER_ID, kind: 'sets' } },
        update: { data: { items: [set('a'), set('b')], deleted: [] }, revision: { increment: 1 }, updatedAt: NOW }
      })
    );
  });

  it('leaves the revision alone when the write changes nothing', async () => {
    const { service, prisma } = createService();
    const row = storedRow({ items: [set('a', 2_000)], deleted: [] });

    prisma.modSyncLibrary.findUnique.mockResolvedValue(row);

    const saved = await service.saveSets({ userId: USER_ID, body: { sets: [set('a', 1_000)], deleted: [], mode: 'merge' } });

    expect(prisma.modSyncLibrary.upsert).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ revision: row.revision, updated_at: row.updatedAt.toISOString() });
  });

  it('does not create a row for an empty first write', async () => {
    const { service, prisma } = createService();

    prisma.modSyncLibrary.findUnique.mockResolvedValue(null);

    const saved = await service.saveSets({ userId: USER_ID, body: { sets: [], deleted: [], mode: 'replace' } });

    expect(prisma.modSyncLibrary.upsert).not.toHaveBeenCalled();
    expect(saved).toEqual({ sets: [], deleted: [], revision: 0, updated_at: null });
  });

  it('stores components without repeats', async () => {
    const { service, prisma } = createService();

    prisma.modSyncLibrary.findUnique.mockResolvedValue(null);

    const saved = await service.saveSets({
      userId: USER_ID,
      body: { sets: [{ ...set('a'), components: ['core', 'ui', 'core'] }], deleted: [], mode: 'merge' }
    });

    expect(saved.sets[0]?.components).toEqual(['core', 'ui']);
  });
});

describe('ModSyncWriterService.saveProfiles', () => {
  it('never stores the settings the mod keeps out of profiles', async () => {
    const { service, prisma } = createService();
    const [excluded] = MOD_SYNC.excludedConfigKeys;

    prisma.modSyncLibrary.findUnique.mockResolvedValue(null);

    const saved = await service.saveProfiles({
      userId: USER_ID,
      body: {
        profiles: [{ id: 'p', name: 'Main', created: null, updated: 5, data: { config: { [excluded]: 'secret', hud_scale: 1 }, components: {} } }],
        deleted: [],
        mode: 'merge'
      }
    });

    expect(saved.profiles[0]?.data.config).toEqual({ hud_scale: 1 });
    expect(JSON.stringify(prisma.modSyncLibrary.upsert.mock.calls[0]?.[0].create.data)).not.toContain(excluded);
  });
});

describe('ModSyncWriterService.clear', () => {
  it('deletes both libraries of the user', async () => {
    const { service, prisma } = createService();

    await service.clear(USER_ID);

    expect(prisma.modSyncLibrary.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
  });
});
