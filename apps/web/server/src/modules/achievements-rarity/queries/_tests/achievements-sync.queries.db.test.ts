import { afterAll, beforeEach, expect, it } from 'vitest';

import type { TrackingTier } from '../../../../../generated';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { fetchCandidates } from '../achievements-sync.queries';

const AT = {
  staleBefore: new Date('2026-09-28T12:00:00Z'),
  fresh: new Date('2026-10-01T12:00:00Z'),
  stale: new Date('2026-09-20T12:00:00Z'),
  staler: new Date('2026-09-10T12:00:00Z'),
  recentBattle: new Date('2026-10-04T12:00:00Z'),
  olderBattle: new Date('2026-10-03T12:00:00Z')
} as const;

const ACCOUNT = {
  neverFetched: 1001n,
  population: 1002n,
  stale: 1003n,
  staler: 1004n,
  fresh: 1005n,
  dormant: 1006n,
  hidden: 1007n,
  deleting: 1008n,
  supersededDeletion: 1009n,
  tiedBattle: 1010n,
  failedDeletion: 1011n,
  fetchedOnBoundary: 1012n
} as const;

type PlayerSeed = {
  accountId: bigint;
  trackingTier?: TrackingTier;
  isHidden?: boolean;
  lastBattleAt?: Date | null;
};

describeWithDatabase('achievements sync queries', () => {
  const prisma = createTestPrisma();

  const candidates = async (limit = 100) =>
    (await fetchCandidates({ db: prisma.$kysely, staleBefore: AT.staleBefore, limit })).map((row) => Number(row.accountId));

  const seedPlayers = (players: PlayerSeed[]) =>
    prisma.player.createMany({
      data: players.map(({ accountId, trackingTier = 'active', isHidden = false, lastBattleAt = null }) => ({
        accountId,
        nickname: `player-${accountId}`,
        trackingTier,
        isHidden,
        lastBattleAt
      }))
    });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_achievements', 'data_deletion_request', 'player'] });

    await seedPlayers([
      { accountId: ACCOUNT.neverFetched, lastBattleAt: AT.recentBattle },
      { accountId: ACCOUNT.population, trackingTier: 'population' },
      { accountId: ACCOUNT.stale, lastBattleAt: AT.recentBattle },
      { accountId: ACCOUNT.staler },
      { accountId: ACCOUNT.fresh },
      { accountId: ACCOUNT.dormant, trackingTier: 'dormant' },
      { accountId: ACCOUNT.hidden, isHidden: true },
      { accountId: ACCOUNT.deleting },
      { accountId: ACCOUNT.supersededDeletion, lastBattleAt: AT.olderBattle },
      { accountId: ACCOUNT.tiedBattle, lastBattleAt: AT.recentBattle },
      { accountId: ACCOUNT.failedDeletion },
      { accountId: ACCOUNT.fetchedOnBoundary }
    ]);

    await prisma.accountAchievements.createMany({
      data: [
        { accountId: ACCOUNT.stale, counts: {}, fetchedAt: AT.stale },
        { accountId: ACCOUNT.staler, counts: {}, fetchedAt: AT.staler },
        { accountId: ACCOUNT.fresh, counts: {}, fetchedAt: AT.fresh },
        { accountId: ACCOUNT.fetchedOnBoundary, counts: {}, fetchedAt: AT.staleBefore }
      ]
    });

    await prisma.dataDeletionRequest.createMany({
      data: [
        { accountId: ACCOUNT.deleting, source: 'user', status: 'pending' },
        { accountId: ACCOUNT.supersededDeletion, source: 'lesta', status: 'superseded' },
        { accountId: ACCOUNT.failedDeletion, source: 'lesta', status: 'failed' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists never-fetched accounts first by latest battle, then stale ones oldest first', async () => {
    expect(await candidates()).toEqual([
      Number(ACCOUNT.neverFetched),
      Number(ACCOUNT.tiedBattle),
      Number(ACCOUNT.supersededDeletion),
      Number(ACCOUNT.population),
      Number(ACCOUNT.staler),
      Number(ACCOUNT.stale)
    ]);
  });

  it('honours the limit', async () => {
    expect(await candidates(2)).toEqual([Number(ACCOUNT.neverFetched), Number(ACCOUNT.tiedBattle)]);
  });

  it('skips accounts with a blocking deletion request but not a superseded one', async () => {
    const listed = await candidates();

    expect(listed).not.toContain(Number(ACCOUNT.deleting));
    expect(listed).not.toContain(Number(ACCOUNT.failedDeletion));
    expect(listed).toContain(Number(ACCOUNT.supersededDeletion));
  });
});
