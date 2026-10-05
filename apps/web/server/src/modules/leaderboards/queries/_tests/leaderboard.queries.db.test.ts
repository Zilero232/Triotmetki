import type { LeaderboardQuery } from '@otmetki/schemas';

import { leaderboardQuerySchema } from '@otmetki/schemas';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { leaderboardQueries } from '../leaderboard.queries';

const query = (overrides: Partial<LeaderboardQuery>): LeaderboardQuery => ({ ...leaderboardQuerySchema.parse({}), ...overrides });

const ACCOUNTS = [9n, 3n, 7n, 1n, 5n] as const;
const CLANS = [90n, 30n, 70n, 10n, 50n] as const;

const day = (date: string) => new Date(`${date}T12:00:00Z`);

const seed = async (prisma: ReturnType<typeof createTestPrisma>) => {
  await prisma.vehicle.create({
    data: { tankId: 11, name: 'Heavy X', shortName: 'HX', slug: 'heavy-x', nation: 'ussr', type: 'heavyTank', tier: 10 }
  });

  for (const accountId of ACCOUNTS) {
    await prisma.player.create({ data: { accountId, nickname: `P${accountId}` } });

    await prisma.accountRating.create({
      data: { accountId, period: 'overall', battles: 2_000, wn8: 2_000, winRate: 50, avgDamage: 2_000, avgFrags: 1 }
    });

    await prisma.accountRating.create({ data: { accountId, period: 'd7', battles: 50, wn8: 2_500, winRate: 50, avgDamage: 2_000, avgFrags: 1 } });

    await prisma.accountTankRating.create({
      data: { accountId, tankId: 11, period: 'overall', battles: 200, wn8: 2_000, winRate: 50, avgDamage: 2_000, avgFrags: 1, avgXp: 1 }
    });

    await prisma.playerTank.create({ data: { accountId, tankId: 11, battles: 100, marksOnGun: 3 } });
  }

  for (const clanId of CLANS) {
    await prisma.clan.create({ data: { clanId, tag: `C${clanId}`, name: `Clan ${clanId}` } });
    await prisma.clanSnapshot.create({ data: { clanId, capturedAt: day('2026-10-01'), membersCount: 10, avgWn8: 1_500 } });
  }
};

const pageIds = async (pages: Promise<{ rows: { accountId: number | null; clanId: number | null }[] }>[]) =>
  (await Promise.all(pages)).flatMap((page) => page.rows.map((row) => row.accountId ?? row.clanId));

describeWithDatabase('leaderboardQueries on a database with tied values', () => {
  const prisma = createTestPrisma();
  const db = prisma.$kysely;

  beforeAll(async () => {
    await truncateTables({
      prisma,
      tables: ['player_tank', 'clan_snapshot', 'account_tank_rating', 'account_rating', 'vehicle', 'player', 'clan']
    });

    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const pages = [0, 2, 4].map((offset) => ({ limit: 2, offset }));

  it('pages tied players in account order, so no row repeats or goes missing across pages', async () => {
    const ids = await pageIds(
      pages.map((page) =>
        leaderboardQueries.playersBoard({ db, query: query({ metric: 'wn8', period: 'overall', ...page }), minBattles: 1, isStreamersOnly: false })
      )
    );

    expect(ids).toEqual([1, 3, 5, 7, 9]);
  });

  it('pages tied tank-rating players in account order', async () => {
    const ids = await pageIds(
      pages.map((page) =>
        leaderboardQueries.tankPlayersBoard({ db, query: query({ metric: 'wn8', period: 'overall', tier: 10, ...page }), minBattles: 1 })
      )
    );

    expect(ids).toEqual([1, 3, 5, 7, 9]);
  });

  it('pages tied clans in clan order', async () => {
    const ids = await pageIds(pages.map((page) => leaderboardQueries.clansBoard({ db, query: query({ scope: 'clans', metric: 'wn8', ...page }) })));

    expect(ids).toEqual([10, 30, 50, 70, 90]);
  });

  it('pages tied rising stars in account order', async () => {
    const ids = await pageIds(
      pages.map((page) =>
        leaderboardQueries.risingStarsBoard({
          db,
          query: query({ scope: 'risingStars', metric: 'wn8', period: '7d', ...page }),
          period: '7d',
          minBattles: 1
        })
      )
    );

    expect(ids).toEqual([1, 3, 5, 7, 9]);
  });

  it('pages tied mark counts in account order', async () => {
    const ids = await pageIds(pages.map((page) => leaderboardQueries.marksBoard({ db, query: query({ scope: 'marks', ...page }) })));

    expect(ids).toEqual([1, 3, 5, 7, 9]);
  });
});
