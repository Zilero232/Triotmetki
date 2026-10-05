import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { Prisma } from '../../../../../../../generated';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { accountSnapshotSeed, playerSeed, tankSnapshotSeed } from '../../../_tests/aggregates.seeds';
import { accountSnapshotWindow, replaceAccountRatings, replaceAccountTankRatings, tankBoundary } from '../account-ratings.queries';

const ACCOUNT = 1_000_000_101n;
const OTHER = 1_000_000_102n;
const OLD_COMPUTED_AT = new Date('2026-01-01T00:00:00Z');
const at = (iso: string) => new Date(iso);

const ratingRow = (period: Prisma.AccountRatingCreateManyInput['period'], battles: number): Prisma.AccountRatingCreateManyInput => ({
  accountId: ACCOUNT,
  period,
  battles,
  winRate: 50,
  avgDamage: 1000,
  avgFrags: 1,
  avgTier: 8,
  wn8: 1500,
  eff: 1200,
  broneIndex: 60,
  fromCapturedAt: at('2026-09-01T00:00:00Z'),
  toCapturedAt: at('2026-10-01T00:00:00Z')
});

const tankRatingRow = (tankId: number, battles: number): Prisma.AccountTankRatingCreateManyInput => ({
  accountId: ACCOUNT,
  tankId,
  period: 'overall',
  battles,
  winRate: 50,
  avgDamage: 1000,
  avgFrags: 1,
  avgXp: 500,
  wn8: 1500,
  damagePercentile: 40
});

describeWithDatabase('account ratings queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_snapshot', 'tank_snapshot', 'account_rating', 'account_tank_rating', 'player'] });
    await prisma.player.createMany({ data: [playerSeed(ACCOUNT), playerSeed(OTHER)] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('accountSnapshotWindow', () => {
    const snapshotWindow = (input: { since: Date; battles: number }) =>
      accountSnapshotWindow({ db: prisma.$kysely, accountId: Number(ACCOUNT), mode: 'random', ...input });

    beforeEach(async () => {
      await prisma.accountSnapshot.createMany({
        data: [
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-08-01T00:00:00Z'), battles: 100 }),
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-08-10T00:00:00Z'), battles: 200 }),
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-08-20T00:00:00Z'), battles: 300 }),
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-09-01T00:00:00Z'), battles: 400 }),
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-09-10T00:00:00Z'), battles: 500 }),
          accountSnapshotSeed({ accountId: ACCOUNT, capturedAt: at('2026-09-20T00:00:00Z'), battles: 600 }),
          accountSnapshotSeed({ accountId: ACCOUNT, mode: 'all', capturedAt: at('2026-08-15T00:00:00Z'), battles: 250 }),
          accountSnapshotSeed({ accountId: OTHER, capturedAt: at('2026-08-25T00:00:00Z'), battles: 350 })
        ]
      });
    });

    it('keeps the points inside the window, the one at its edge, the battle-count start and the first one, oldest first', async () => {
      const rows = await snapshotWindow({ since: at('2026-09-05T00:00:00Z'), battles: 250 });

      expect(rows).toEqual([
        { capturedAt: at('2026-08-01T00:00:00Z'), battles: 100 },
        { capturedAt: at('2026-08-20T00:00:00Z'), battles: 300 },
        { capturedAt: at('2026-09-01T00:00:00Z'), battles: 400 },
        { capturedAt: at('2026-09-10T00:00:00Z'), battles: 500 },
        { capturedAt: at('2026-09-20T00:00:00Z'), battles: 600 }
      ]);
    });

    it('lists a point picked by several rules once', async () => {
      const rows = await snapshotWindow({ since: at('2026-09-15T00:00:00Z'), battles: 100 });

      expect(rows).toEqual([
        { capturedAt: at('2026-08-01T00:00:00Z'), battles: 100 },
        { capturedAt: at('2026-09-10T00:00:00Z'), battles: 500 },
        { capturedAt: at('2026-09-20T00:00:00Z'), battles: 600 }
      ]);
    });
  });

  describe('tankBoundary', () => {
    it('takes the last snapshot of each tank at or before the cutoff', async () => {
      await prisma.tankSnapshot.createMany({
        data: [
          tankSnapshotSeed({ accountId: ACCOUNT, tankId: 1, capturedAt: at('2026-09-01T00:00:00Z'), battles: 10, wins: 5 }),
          tankSnapshotSeed({
            accountId: ACCOUNT,
            tankId: 1,
            capturedAt: at('2026-09-05T00:00:00Z'),
            battles: 20,
            wins: 11,
            losses: 9,
            damageDealt: 30_000,
            damageReceived: 25_000,
            frags: 15,
            spotted: 12,
            xp: 9000,
            survived: 7,
            hits: 140,
            shots: 180,
            capturePoints: 3,
            droppedCapturePoints: 4
          }),
          tankSnapshotSeed({ accountId: ACCOUNT, tankId: 1, capturedAt: at('2026-09-06T00:00:00Z'), battles: 30 }),
          tankSnapshotSeed({ accountId: ACCOUNT, tankId: 2, capturedAt: at('2026-08-01T00:00:00Z'), battles: 4 }),
          tankSnapshotSeed({ accountId: ACCOUNT, tankId: 3, capturedAt: at('2026-09-07T00:00:00Z'), battles: 6 }),
          tankSnapshotSeed({ accountId: ACCOUNT, tankId: 2, mode: 'all', capturedAt: at('2026-09-04T00:00:00Z'), battles: 8 }),
          tankSnapshotSeed({ accountId: OTHER, tankId: 2, capturedAt: at('2026-09-04T00:00:00Z'), battles: 9 })
        ]
      });

      const rows = await tankBoundary({ db: prisma.$kysely, accountId: Number(ACCOUNT), mode: 'random', cutoff: at('2026-09-05T00:00:00Z') });

      expect(rows).toEqual([
        {
          tankId: 1,
          capturedAt: at('2026-09-05T00:00:00Z'),
          battles: 20,
          wins: 11,
          losses: 9,
          damageDealt: 30_000,
          damageReceived: 25_000,
          frags: 15,
          spotted: 12,
          xp: 9000,
          survived: 7,
          hits: 140,
          shots: 180,
          capturePoints: 3,
          droppedCapturePoints: 4
        },
        {
          tankId: 2,
          capturedAt: at('2026-08-01T00:00:00Z'),
          battles: 4,
          wins: 0,
          losses: 0,
          damageDealt: 0,
          damageReceived: 0,
          frags: 0,
          spotted: 0,
          xp: 0,
          survived: 0,
          hits: 0,
          shots: 0,
          capturePoints: 0,
          droppedCapturePoints: 0
        }
      ]);
    });
  });

  describe('replaceAccountRatings', () => {
    const replace = (rows: Prisma.AccountRatingCreateManyInput[]) => replaceAccountRatings({ db: prisma.$kysely, accountId: Number(ACCOUNT), rows });

    const stored = () =>
      prisma.accountRating.findMany({
        select: { accountId: true, period: true, battles: true, wn8: true, toCapturedAt: true, computedAt: true },
        orderBy: [{ accountId: 'asc' }, { period: 'asc' }]
      });

    beforeEach(async () => {
      await prisma.accountRating.createMany({
        data: [
          { ...ratingRow('overall', 100), computedAt: OLD_COMPUTED_AT },
          { ...ratingRow('d7', 10), computedAt: OLD_COMPUTED_AT },
          { ...ratingRow('d30', 30), computedAt: OLD_COMPUTED_AT },
          { ...ratingRow('overall', 500), accountId: OTHER, computedAt: OLD_COMPUTED_AT }
        ]
      });
    });

    it('updates changed periods, leaves unchanged ones untouched, adds new ones and drops the missing ones', async () => {
      await replace([{ ...ratingRow('overall', 120), wn8: null }, ratingRow('d7', 10), ratingRow('h24', 2)]);

      const rows = await stored();

      expect(rows.map(({ computedAt, ...row }) => ({ ...row, fresh: computedAt > OLD_COMPUTED_AT }))).toEqual([
        { accountId: ACCOUNT, period: 'overall', battles: 120, wn8: null, toCapturedAt: at('2026-10-01T00:00:00Z'), fresh: true },
        { accountId: ACCOUNT, period: 'h24', battles: 2, wn8: 1500, toCapturedAt: at('2026-10-01T00:00:00Z'), fresh: true },
        { accountId: ACCOUNT, period: 'd7', battles: 10, wn8: 1500, toCapturedAt: at('2026-10-01T00:00:00Z'), fresh: false },
        { accountId: OTHER, period: 'overall', battles: 500, wn8: 1500, toCapturedAt: at('2026-10-01T00:00:00Z'), fresh: false }
      ]);
    });

    it('removes every period of the account when nothing comes in', async () => {
      await replace([]);

      const rows = await stored();

      expect(rows.map((row) => [row.accountId, row.period])).toEqual([[OTHER, 'overall']]);
    });
  });

  describe('replaceAccountTankRatings', () => {
    const replace = (rows: Prisma.AccountTankRatingCreateManyInput[]) =>
      replaceAccountTankRatings({ db: prisma.$kysely, accountId: Number(ACCOUNT), rows });

    const stored = () =>
      prisma.accountTankRating.findMany({
        select: { accountId: true, tankId: true, period: true, battles: true, damagePercentile: true, computedAt: true },
        orderBy: [{ accountId: 'asc' }, { tankId: 'asc' }, { period: 'asc' }]
      });

    beforeEach(async () => {
      await prisma.accountTankRating.createMany({
        data: [
          { ...tankRatingRow(1, 10), computedAt: OLD_COMPUTED_AT },
          { ...tankRatingRow(2, 20), computedAt: OLD_COMPUTED_AT },
          { ...tankRatingRow(3, 30), computedAt: OLD_COMPUTED_AT },
          { ...tankRatingRow(1, 50), accountId: OTHER, computedAt: OLD_COMPUTED_AT }
        ]
      });
    });

    it('updates changed tanks, leaves unchanged ones untouched, adds new ones and drops the missing ones', async () => {
      await replace([{ ...tankRatingRow(1, 11), damagePercentile: null }, tankRatingRow(2, 20), { ...tankRatingRow(2, 5), period: 'd7' }]);

      const rows = await stored();

      expect(rows.map(({ computedAt, ...row }) => ({ ...row, fresh: computedAt > OLD_COMPUTED_AT }))).toEqual([
        { accountId: ACCOUNT, tankId: 1, period: 'overall', battles: 11, damagePercentile: null, fresh: true },
        { accountId: ACCOUNT, tankId: 2, period: 'overall', battles: 20, damagePercentile: 40, fresh: false },
        { accountId: ACCOUNT, tankId: 2, period: 'd7', battles: 5, damagePercentile: 40, fresh: true },
        { accountId: OTHER, tankId: 1, period: 'overall', battles: 50, damagePercentile: 40, fresh: false }
      ]);
    });

    it('removes every tank of the account when nothing comes in', async () => {
      await replace([]);

      const rows = await stored();

      expect(rows.map((row) => [row.accountId, row.tankId])).toEqual([[OTHER, 1]]);
    });
  });
});
