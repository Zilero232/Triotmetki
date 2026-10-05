import type { LeaderboardQuery } from '@otmetki/schemas';

import { leaderboardQuerySchema } from '@otmetki/schemas';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { LeaderboardService } from '../leaderboard.service';

const query = (overrides: Partial<LeaderboardQuery>): LeaderboardQuery => ({ ...leaderboardQuerySchema.parse({}), ...overrides });

const PLAYERS = [
  { accountId: 1n, nickname: 'Alpha', clanId: 100n },
  { accountId: 2n, nickname: 'Bravo', clanId: null },
  { accountId: 3n, nickname: 'Charlie', clanId: 100n },
  { accountId: 4n, nickname: 'Delta', clanId: null, isHidden: true },
  { accountId: 5n, nickname: 'Echo', clanId: 200n }
] as const;

const RATINGS = [
  { accountId: 1n, period: 'overall', battles: 5_000, wn8: 2_000, eff: 1_500, winRate: 55, avgDamage: 2_100 },
  { accountId: 2n, period: 'overall', battles: 1_500, wn8: 2_500, eff: null, winRate: 60, avgDamage: 2_500 },
  { accountId: 3n, period: 'overall', battles: 900, wn8: 3_000, eff: 1_800, winRate: 58, avgDamage: 2_900 },
  { accountId: 4n, period: 'overall', battles: 9_000, wn8: 4_000, eff: 2_000, winRate: 70, avgDamage: 4_000 },
  { accountId: 5n, period: 'overall', battles: 2_000, wn8: null, eff: 1_200, winRate: 50, avgDamage: 1_800 },
  { accountId: 1n, period: 'd7', battles: 40, wn8: 2_600, eff: 1_600, winRate: 57, avgDamage: 2_300 },
  { accountId: 2n, period: 'd7', battles: 30, wn8: 2_700, eff: 1_700, winRate: 61, avgDamage: 2_600 },
  { accountId: 3n, period: 'd7', battles: 10, wn8: 3_900, eff: 1_900, winRate: 65, avgDamage: 3_100 },
  { accountId: 5n, period: 'd7', battles: 25, wn8: 1_000, eff: 1_000, winRate: 49, avgDamage: 1_500 }
] as const;

const VEHICLES = [
  { tankId: 11, name: 'Heavy X', shortName: 'HX', slug: 'heavy-x', nation: 'ussr', type: 'heavyTank', tier: 10 },
  { tankId: 12, name: 'Medium X', shortName: 'MX', slug: 'medium-x', nation: 'germany', type: 'mediumTank', tier: 10 },
  { tankId: 13, name: 'Medium VIII', shortName: 'M8', slug: 'medium-viii', nation: 'usa', type: 'mediumTank', tier: 8 }
] as const;

const TANK_RATINGS = [
  { accountId: 1n, tankId: 11, battles: 100, wn8: 2_000, winRate: 50, avgDamage: 3_000 },
  { accountId: 1n, tankId: 12, battles: 300, wn8: 3_000, winRate: 60, avgDamage: 2_000 },
  { accountId: 2n, tankId: 11, battles: 200, wn8: 2_200, winRate: 55, avgDamage: 3_500 },
  { accountId: 2n, tankId: 13, battles: 50, wn8: null, winRate: 40, avgDamage: 1_500 },
  { accountId: 3n, tankId: 12, battles: 20, wn8: 4_000, winRate: 70, avgDamage: 2_800 },
  { accountId: 4n, tankId: 11, battles: 500, wn8: 5_000, winRate: 75, avgDamage: 5_000 },
  { accountId: 5n, tankId: 13, battles: 80, wn8: null, winRate: 45, avgDamage: 1_400 }
] as const;

const day = (date: string) => new Date(`${date}T12:00:00Z`);

const seed = async (prisma: ReturnType<typeof createTestPrisma>) => {
  await prisma.clan.createMany({
    data: [
      { clanId: 100n, tag: 'AAA', name: 'Clan A', color: '#111111' },
      { clanId: 200n, tag: 'BBB', name: 'Clan B', color: null },
      { clanId: 300n, tag: 'CCC', name: 'Clan C', color: '#333333', isDisbanded: true },
      { clanId: 400n, tag: 'DDD', name: 'Clan D', color: '#444444' }
    ]
  });

  await prisma.player.createMany({ data: PLAYERS.map((player) => ({ ...player })) });
  await prisma.accountRating.createMany({ data: RATINGS.map((rating) => ({ ...rating, avgFrags: 1 })) });
  await prisma.vehicle.createMany({ data: VEHICLES.map((vehicle) => ({ ...vehicle })) });
  await prisma.accountTankRating.createMany({ data: TANK_RATINGS.map((rating) => ({ ...rating, period: 'overall', avgFrags: 1, avgXp: 1 })) });

  await prisma.streamerProfile.createMany({
    data: [
      { slug: 'bravo-live', displayName: 'Bravo TV', accountId: 2n },
      { slug: 'charlie-live', displayName: 'Charlie TV', accountId: 3n },
      { slug: 'nobody', displayName: 'No Account', accountId: null }
    ]
  });

  await prisma.clanSnapshot.createMany({
    data: [
      { clanId: 100n, capturedAt: day('2026-10-01'), membersCount: 10, avgWn8: 9_000, avgWinRate: 70, battlesDelta: 5 },
      { clanId: 100n, capturedAt: day('2026-10-03'), membersCount: 10, avgWn8: 1_700, avgWinRate: 52, battlesDelta: null },
      { clanId: 200n, capturedAt: day('2026-10-02'), membersCount: 5, avgWn8: 1_900, avgWinRate: 50, battlesDelta: 40 },
      { clanId: 300n, capturedAt: day('2026-10-02'), membersCount: 5, avgWn8: 5_000, avgWinRate: 80, battlesDelta: 1 },
      { clanId: 400n, capturedAt: day('2026-10-01'), membersCount: 5, avgWn8: 6_000, avgWinRate: 75, battlesDelta: 3 },
      { clanId: 400n, capturedAt: day('2026-10-02'), membersCount: 5, avgWn8: null, avgWinRate: 49, battlesDelta: 7 }
    ]
  });

  await prisma.playerTank.createMany({
    data: [
      { accountId: 1n, tankId: 11, battles: 100, marksOnGun: 3 },
      { accountId: 1n, tankId: 12, battles: 300, marksOnGun: 3 },
      { accountId: 1n, tankId: 13, battles: 50, marksOnGun: 2 },
      { accountId: 2n, tankId: 11, battles: 200, marksOnGun: 3 },
      { accountId: 2n, tankId: 12, battles: 10, marksOnGun: 3, marksSource: 'mod' },
      { accountId: 3n, tankId: 11, battles: 0, marksOnGun: 3 },
      { accountId: 4n, tankId: 11, battles: 500, marksOnGun: 3 },
      { accountId: 5n, tankId: 11, battles: 70, marksOnGun: 3 },
      { accountId: 5n, tankId: 12, battles: 80, marksOnGun: 3 },
      { accountId: 5n, tankId: 13, battles: 90, marksOnGun: 3 }
    ]
  });
};

const entry = (overrides: Record<string, unknown>) => ({ clanId: null, color: null, delta: null, ...overrides });

describeWithDatabase('LeaderboardService.leaderboard on a database', () => {
  const prisma = createTestPrisma();
  const service = new LeaderboardService(prisma);

  beforeAll(async () => {
    await truncateTables({
      prisma,
      tables: ['player_tank', 'clan_snapshot', 'streamer_profile', 'account_tank_rating', 'account_rating', 'vehicle', 'player', 'clan']
    });

    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ranks visible players of a period by the metric, above the battles threshold, skipping a null metric', async () => {
    const board = await service.leaderboard(query({ scope: 'players', metric: 'wn8', period: 'overall' }));

    expect(board.total).toBe(2);
    expect(board.minBattles).toBe(1_000);

    expect(board.entries).toEqual([
      entry({ rank: 1, accountId: 2, name: 'Bravo TV', clanTag: null, value: 2_500, tier: expect.any(String), battles: 1_500 }),
      entry({ rank: 2, accountId: 1, name: 'Alpha', clanTag: 'AAA', value: 2_000, tier: expect.any(String), battles: 5_000 })
    ]);
  });

  it('reads the column of the metric', async () => {
    const board = await service.leaderboard(query({ scope: 'players', metric: 'eff', period: 'overall', minBattles: 1 }));

    expect(board.entries.map(({ accountId, value }) => [accountId, value])).toEqual([
      [3, 1_800],
      [1, 1_500],
      [5, 1_200]
    ]);

    expect(board.total).toBe(3);
  });

  it('pages the players and keeps the total of the whole ranking', async () => {
    const board = await service.leaderboard(query({ scope: 'players', metric: 'avgDamage', period: '7d', limit: 2, offset: 1 }));

    expect(board.total).toBe(3);

    expect(board.entries.map(({ rank, accountId, value, tier }) => [rank, accountId, value, tier])).toEqual([
      [2, 1, 2_300, null],
      [3, 5, 1_500, null]
    ]);
  });

  it('limits the streamers scope to accounts with a streamer profile', async () => {
    const board = await service.leaderboard(query({ scope: 'streamers', metric: 'winRate', period: '7d', minBattles: 1 }));

    expect(board.total).toBe(2);

    expect(board.entries.map(({ accountId, name, value }) => [accountId, name, value])).toEqual([
      [3, 'Charlie TV', 65],
      [2, 'Bravo TV', 61]
    ]);
  });

  it('weights the tank ratings by battles across the filtered tanks', async () => {
    const board = await service.leaderboard(query({ scope: 'players', metric: 'wn8', period: 'overall', tier: 10, minBattles: 100 }));

    expect(board.total).toBe(2);

    expect(board.entries.map(({ accountId, name, value, battles }) => [accountId, name, value, battles])).toEqual([
      [1, 'Alpha', 2_750, 400],
      [2, 'Bravo', 2_200, 200]
    ]);
  });

  it('filters the tank ratings by tank and by vehicle type, ignoring battles without the metric', async () => {
    const byTank = await service.leaderboard(query({ scope: 'players', metric: 'avgDamage', period: 'overall', tankId: 11, minBattles: 1 }));
    const byType = await service.leaderboard(query({ scope: 'players', metric: 'wn8', period: 'overall', type: 'mediumTank', minBattles: 1 }));

    expect(byTank.entries.map(({ accountId, value }) => [accountId, value])).toEqual([
      [2, 3_500],
      [1, 3_000]
    ]);

    expect(byType.total).toBe(2);

    expect(byType.entries.map(({ accountId, value, battles }) => [accountId, value, battles])).toEqual([
      [3, 4_000, 20],
      [1, 3_000, 300]
    ]);
  });

  it('ranks active clans by their latest snapshot', async () => {
    const board = await service.leaderboard(query({ scope: 'clans', metric: 'wn8' }));

    expect(board.total).toBe(2);
    expect(board.minBattles).toBeNull();

    expect(board.entries).toEqual([
      { rank: 1, accountId: null, clanId: 200, name: 'Clan B', clanTag: 'BBB', color: null, value: 1_900, tier: null, battles: 40, delta: null },
      { rank: 2, accountId: null, clanId: 100, name: 'Clan A', clanTag: 'AAA', color: '#111111', value: 1_700, tier: null, battles: 0, delta: null }
    ]);
  });

  it('ranks rising stars by the gain of the period over their overall value', async () => {
    const board = await service.leaderboard(query({ scope: 'risingStars', metric: 'wn8', period: '7d', minBattles: 20 }));

    expect(board.total).toBe(2);
    expect(board.minBattles).toBe(20);

    expect(board.entries.map(({ accountId, value, delta, battles }) => [accountId, value, delta, battles])).toEqual([
      [1, 2_600, 600, 40],
      [2, 2_700, 200, 30]
    ]);
  });

  it('counts the three-mark tanks Lesta reported, with battles, for visible players', async () => {
    const board = await service.leaderboard(query({ scope: 'marks' }));

    expect(board.total).toBe(3);

    expect(board.entries).toEqual([
      entry({ rank: 1, accountId: 5, name: 'Echo', clanTag: 'BBB', value: 3, tier: null, battles: 240 }),
      entry({ rank: 2, accountId: 1, name: 'Alpha', clanTag: 'AAA', value: 2, tier: null, battles: 400 }),
      entry({ rank: 3, accountId: 2, name: 'Bravo', clanTag: null, value: 1, tier: null, battles: 200 })
    ]);
  });
});
