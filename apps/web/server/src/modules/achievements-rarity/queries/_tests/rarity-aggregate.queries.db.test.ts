import { sortBy } from 'remeda';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { TrackingTier } from '../../../../../generated';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { tankOwners as queryTankOwners, updateRollups } from '../rarity-aggregate.queries';

const TANK = { popular: 1, garageOnly: 2, dormantOnly: 3, unplayed: 4 } as const;

const ACCOUNT = { first: 2001n, second: 2002n, population: 2003n, dormant: 2004n, untouched: 2005n } as const;

const FETCHED_AT = new Date('2026-10-01T00:00:00Z');
const COMPUTED_AT = new Date('2026-10-05T06:45:00Z');

const seedPlayers = (prisma: ReturnType<typeof createTestPrisma>, players: { accountId: bigint; trackingTier: TrackingTier }[]) =>
  prisma.player.createMany({ data: players.map((player) => ({ ...player, nickname: `player-${player.accountId}` })) });

describeWithDatabase('rarity aggregate queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_achievements', 'player_tank', 'player'] });

    await seedPlayers(prisma, [
      { accountId: ACCOUNT.first, trackingTier: 'active' },
      { accountId: ACCOUNT.second, trackingTier: 'active' },
      { accountId: ACCOUNT.population, trackingTier: 'population' },
      { accountId: ACCOUNT.dormant, trackingTier: 'dormant' },
      { accountId: ACCOUNT.untouched, trackingTier: 'active' }
    ]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('tank owners', () => {
    const tankOwners = async () => {
      const rows = await queryTankOwners({ db: prisma.$kysely });

      return sortBy(
        rows.map((row) => ({ tankId: Number(row.tankId), owners: Number(row.owners), sample: Number(row.sample) })),
        (row) => row.tankId
      );
    };

    beforeEach(async () => {
      await prisma.playerTank.createMany({
        data: [
          { accountId: ACCOUNT.first, tankId: TANK.popular, battles: 10 },
          { accountId: ACCOUNT.second, tankId: TANK.popular, battles: 1 },
          { accountId: ACCOUNT.population, tankId: TANK.popular, battles: 5 },
          { accountId: ACCOUNT.first, tankId: TANK.garageOnly, battles: 0, inGarage: true },
          { accountId: ACCOUNT.second, tankId: TANK.garageOnly, battles: 0, inGarage: null },
          { accountId: ACCOUNT.dormant, tankId: TANK.dormantOnly, battles: 50 },
          { accountId: ACCOUNT.untouched, tankId: TANK.unplayed, battles: 0, inGarage: false }
        ]
      });
    });

    it('counts owners per tank among tracked players, with the distinct owner sample on every row', async () => {
      expect(await tankOwners()).toEqual([
        { tankId: TANK.popular, owners: 3, sample: 3 },
        { tankId: TANK.garageOnly, owners: 1, sample: 3 }
      ]);
    });
  });

  describe('rollup update', () => {
    const stored = async () =>
      sortBy(
        (
          await prisma.accountAchievements.findMany({
            select: { accountId: true, held: true, points: true, completion: true, computedAt: true, counts: true }
          })
        ).map((row) => ({ ...row, accountId: Number(row.accountId) })),
        (row) => row.accountId
      );

    beforeEach(async () => {
      await prisma.accountAchievements.createMany({
        data: [ACCOUNT.first, ACCOUNT.second, ACCOUNT.untouched].map((accountId) => ({ accountId, counts: { medal: 1 }, fetchedAt: FETCHED_AT }))
      });
    });

    it('writes each rollup onto its own account and leaves the others alone', async () => {
      await updateRollups({
        db: prisma.$kysely,
        rows: [
          { accountId: Number(ACCOUNT.first), held: 3, points: 120, completion: 12.5 },
          { accountId: Number(ACCOUNT.second), held: 0, points: 0, completion: 0 }
        ],
        computedAt: COMPUTED_AT
      });

      expect(await stored()).toEqual([
        { accountId: Number(ACCOUNT.first), held: 3, points: 120, completion: 12.5, computedAt: COMPUTED_AT, counts: { medal: 1 } },
        { accountId: Number(ACCOUNT.second), held: 0, points: 0, completion: 0, computedAt: COMPUTED_AT, counts: { medal: 1 } },
        { accountId: Number(ACCOUNT.untouched), held: 0, points: 0, completion: 0, computedAt: null, counts: { medal: 1 } }
      ]);
    });

    it('creates no row for an account that has none', async () => {
      await updateRollups({
        db: prisma.$kysely,
        rows: [{ accountId: Number(ACCOUNT.population), held: 9, points: 900, completion: 90 }],
        computedAt: COMPUTED_AT
      });

      expect(await prisma.accountAchievements.count({ where: { accountId: ACCOUNT.population } })).toBe(0);
    });
  });
});
