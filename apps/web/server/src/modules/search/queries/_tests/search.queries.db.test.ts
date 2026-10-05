import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { searchQueries } from '../search.queries';

const seed = async (prisma: ReturnType<typeof createTestPrisma>) => {
  await prisma.clan.createMany({
    data: [
      { clanId: 10n, tag: 'TANK', name: 'Tank Lords', membersCount: 50, emblems: { x: 1 } },
      { clanId: 11n, tag: 'TNK', name: 'Tankers United', membersCount: 90 },
      { clanId: 12n, tag: 'XTANK', name: 'Tank Gone', membersCount: 10, isDisbanded: true }
    ]
  });

  await prisma.player.createMany({
    data: [
      { accountId: 1n, nickname: 'Tanker', clanId: 10n },
      { accountId: 2n, nickname: 'Tankist' },
      { accountId: 3n, nickname: 'TankerHidden', isHidden: true },
      { accountId: 4n, nickname: 'Zeus' },
      { accountId: 5n, nickname: 'axbz' }
    ]
  });

  await prisma.playerNickname.createMany({
    data: [
      { accountId: 1n, nickname: 'Tanker' },
      { accountId: 4n, nickname: 'TankerOld' },
      { accountId: 3n, nickname: 'TankerVeryHidden' }
    ]
  });

  await prisma.accountRating.createMany({
    data: [
      { accountId: 1n, period: 'overall', battles: 100, wn8: 1_500, winRate: 50, avgDamage: 1, avgFrags: 1 },
      { accountId: 2n, period: 'overall', battles: 5_000, wn8: 2_500, winRate: 50, avgDamage: 1, avgFrags: 1 },
      { accountId: 2n, period: 'd7', battles: 10, wn8: 9_000, winRate: 50, avgDamage: 1, avgFrags: 1 }
    ]
  });

  await prisma.vehicle.createMany({
    data: [
      { tankId: 1, name: 'IS-7', shortName: 'IS-7', slug: 'is-7', nation: 'ussr', type: 'heavyTank', tier: 10 },
      { tankId: 2, name: 'IS-3', shortName: 'IS-3', slug: 'is-3', nation: 'ussr', type: 'heavyTank', tier: 8 },
      { tankId: 3, name: 'T-34', shortName: 'T-34', slug: 't-34', nation: 'ussr', type: 'mediumTank', tier: 5 },
      { tankId: 4, name: 'IS-4', shortName: 'IS-4', slug: 'is-4', nation: 'ussr', type: 'heavyTank', tier: 10, isActive: false }
    ]
  });

  await prisma.arena.createMany({
    data: [
      { arenaId: 'a1', name: 'Прохоровка', slug: 'prokhorovka', image: 'https://example.com/a1.png' },
      { arenaId: 'a2', name: 'Химмельсдорф', slug: 'himmelsdorf' },
      { arenaId: 'a3', name: 'Прохоровка-2', slug: 'prokhorovka-2', isActive: false }
    ]
  });
};

describeWithDatabase('local search queries', () => {
  const prisma = createTestPrisma();
  const db = prisma.$kysely;

  const search = {
    players: async (terms: string[], limit = 10) =>
      (await searchQueries.players({ db, terms, limit })).map(({ accountId, nickname, clanTag, matchedNickname, wn8, battles, exact, term }) => ({
        accountId: Number(accountId),
        nickname,
        clanTag,
        matchedNickname,
        wn8,
        battles,
        exact,
        term
      })),
    clans: async (terms: string[], limit = 10) =>
      (await searchQueries.clans({ db, terms, limit })).map(({ clanId, tag, name, membersCount, emblems, exact }) => ({
        clanId: Number(clanId),
        tag,
        name,
        membersCount,
        emblems,
        exact
      })),
    tanks: async (terms: string[], limit = 10) => (await searchQueries.tanks({ db, terms, limit })).map(({ tankId }) => tankId),
    maps: async (terms: string[], limit = 10) =>
      (await searchQueries.maps({ db, terms, limit })).map(({ arenaId, slug, name, image }) => ({ arenaId, slug, name, image }))
  };

  beforeAll(async () => {
    await truncateTables({ prisma, tables: ['player_nickname_history', 'account_rating', 'player', 'clan', 'vehicle', 'arena'] });
    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('answers no rows without terms', async () => {
    expect(await search.players([])).toEqual([]);
    expect(await search.clans([])).toEqual([]);
    expect(await search.tanks([])).toEqual([]);
    expect(await search.maps([])).toEqual([]);
  });

  it('ranks players by exact match, then prefix, then similarity, through past nicknames, skipping hidden players', async () => {
    expect(await search.players(['tanker'])).toEqual([
      { accountId: 1, nickname: 'Tanker', clanTag: 'TANK', matchedNickname: null, wn8: 1_500, battles: 100, exact: true, term: 'tanker' },
      { accountId: 4, nickname: 'Zeus', clanTag: null, matchedNickname: 'TankerOld', wn8: null, battles: null, exact: false, term: 'tanker' },
      { accountId: 2, nickname: 'Tankist', clanTag: null, matchedNickname: null, wn8: 2_500, battles: 5_000, exact: false, term: 'tanker' }
    ]);
  });

  it('limits the players and reports the term that matched', async () => {
    expect((await search.players(['tanker'], 2)).map(({ accountId }) => accountId)).toEqual([1, 4]);

    expect(await search.players(['zzz', 'zeus'])).toEqual([
      { accountId: 4, nickname: 'Zeus', clanTag: null, matchedNickname: null, wn8: null, battles: null, exact: true, term: 'zeus' }
    ]);
  });

  it('treats LIKE wildcards in a term literally', async () => {
    expect(await search.players(['a_b%'])).toEqual([]);
  });

  it('ranks active clans by an exact tag first', async () => {
    expect(await search.clans(['tank'])).toEqual([
      { clanId: 10, tag: 'TANK', name: 'Tank Lords', membersCount: 50, emblems: { x: 1 }, exact: true },
      { clanId: 11, tag: 'TNK', name: 'Tankers United', membersCount: 90, emblems: null, exact: false }
    ]);
  });

  it('matches active tanks anywhere in the name, ignoring dashes in the short name, higher tiers first on a tie', async () => {
    expect(await search.tanks(['IS7'])).toEqual([1]);
    expect(await search.tanks(['IS'])).toEqual([1, 2]);
  });

  it('matches active maps by name', async () => {
    expect(await search.maps(['прох'])).toEqual([{ arenaId: 'a1', slug: 'prokhorovka', name: 'Прохоровка', image: 'https://example.com/a1.png' }]);
  });
});
