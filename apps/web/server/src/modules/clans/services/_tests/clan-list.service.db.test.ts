import type { ClanListQuery } from '@otmetki/schemas';

import { clanListQuerySchema } from '@otmetki/schemas';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { ClanListService } from '../clan-list.service';

const query = (overrides: Partial<ClanListQuery>): ClanListQuery => ({ ...clanListQuerySchema.parse({}), ...overrides });

const day = (date: string) => new Date(`${date}T12:00:00Z`);

const seed = async (prisma: ReturnType<typeof createTestPrisma>) => {
  await prisma.clan.createMany({
    data: [
      { clanId: 1n, tag: 'ALPHA', name: 'Alpha Wolves', membersCount: 50, strongholdLevel: 10, color: '#aa0000', createdAt: day('2020-01-01') },
      { clanId: 2n, tag: 'BRAVO', name: 'Bravo 100%', membersCount: 80 },
      { clanId: 3n, tag: 'CHARL', name: 'Charlie', membersCount: 30, strongholdLevel: 5 },
      { clanId: 4n, tag: 'DELTA', name: 'Delta', membersCount: 100, isDisbanded: true },
      { clanId: 5n, tag: 'ECHO1', name: 'Echo', membersCount: 80, strongholdLevel: 8 }
    ]
  });

  await prisma.clanSnapshot.createMany({
    data: [
      { clanId: 1n, capturedAt: day('2026-10-01'), membersCount: 50, avgWn8: 3_000, avgWinRate: 60, activeMembers7d: 30, eloRating10: 900 },
      { clanId: 1n, capturedAt: day('2026-10-03'), membersCount: 50, avgWn8: 1_500, avgWinRate: 52, activeMembers7d: 20, eloRating10: 1_100 },
      { clanId: 2n, capturedAt: day('2026-10-02'), membersCount: 80, avgWn8: 2_000, avgWinRate: 55, activeMembers7d: 40, eloRating10: 1_300 },
      { clanId: 4n, capturedAt: day('2026-10-02'), membersCount: 100, avgWn8: 5_000, avgWinRate: 70, activeMembers7d: 90, eloRating10: 2_000 },
      { clanId: 5n, capturedAt: day('2026-10-02'), membersCount: 80, avgWn8: null, avgWinRate: 49, activeMembers7d: 10, eloRating10: null }
    ]
  });
};

describeWithDatabase('ClanListService.list on a database', () => {
  const prisma = createTestPrisma();
  const service = new ClanListService(prisma);
  const idsOf = async (overrides: Partial<ClanListQuery>) => (await service.list(query(overrides))).items.map(({ clan }) => clan.clanId);

  beforeAll(async () => {
    await truncateTables({ prisma, tables: ['clan_snapshot', 'clan'] });
    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists active clans by members, ties broken by clan id, with the total', async () => {
    const page = await service.list(query({}));

    expect(page.items.map(({ clan }) => clan.clanId)).toEqual([2, 5, 1, 3]);
    expect(page.total).toBe(4);
  });

  it('reads the latest snapshot of a clan', async () => {
    const page = await service.list(query({ search: 'alpha' }));

    expect(page.items).toEqual([
      {
        clan: {
          clanId: 1,
          tag: 'ALPHA',
          name: 'Alpha Wolves',
          color: '#aa0000',
          motto: null,
          emblem: null,
          membersCount: 50,
          createdAt: '2020-01-01T12:00:00.000Z',
          isDisbanded: false
        },
        avgWn8: expect.objectContaining({ value: 1_500 }),
        avgWinRate: 52,
        activeMembers7d: 20,
        eloRating10: 1_100,
        strongholdLevel: 10
      }
    ]);
  });

  it('sorts by a snapshot column with clans without a value last', async () => {
    expect(await idsOf({ sort: 'wn8', order: 'asc' })).toEqual([1, 2, 3, 5]);
    expect(await idsOf({ sort: 'eloRating10', order: 'desc' })).toEqual([2, 1, 3, 5]);
  });

  it('sorts by a clan column', async () => {
    expect(await idsOf({ sort: 'strongholdLevel', order: 'desc' })).toEqual([1, 5, 3, 2]);
  });

  it('matches the search against the tag or the name, case-insensitively and literally', async () => {
    expect(await idsOf({ search: 'bravo' })).toEqual([2]);
    expect(await idsOf({ search: '0%' })).toEqual([2]);
    expect(await idsOf({ search: 'a%e' })).toEqual([]);
  });

  it('applies the minimum filters', async () => {
    expect(await idsOf({ minMembers: 50 })).toEqual([2, 5, 1]);
    expect(await idsOf({ minWn8: 1_800 })).toEqual([2]);
    expect(await idsOf({ minWinRate: 50 })).toEqual([2, 1]);
    expect(await idsOf({ minStrongholdLevel: 8 })).toEqual([5, 1]);
  });

  it('pages the list and keeps the total', async () => {
    const page = await service.list(query({ limit: 2, offset: 1 }));

    expect(page.items.map(({ clan }) => clan.clanId)).toEqual([5, 1]);
    expect(page.total).toBe(4);
  });

  it('reports a zero total for a page past the end', async () => {
    const page = await service.list(query({ offset: 10 }));

    expect(page).toEqual({ items: [], total: 0, limit: 25, offset: 10 });
  });
});
