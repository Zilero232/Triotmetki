import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { moeEstimatePoints } from '../moe-estimate.queries';

const SEED = {
  since: new Date('2026-09-21T00:00:00Z'),
  playedAt: new Date('2026-09-30T12:00:00Z'),
  steps: [65, 85, 95, 100],
  band: 2,
  randomBattleType: '1',
  otherBattleType: '2'
} as const;

type BattleSeed = {
  accountId: bigint;
  tankId: number;
  moePercent: number | null;
  moeMovingAvg: number | null;
  battleType?: string;
  startedAt?: Date;
};

const toBattle = (
  { accountId, tankId, moePercent, moeMovingAvg, battleType = SEED.randomBattleType, startedAt = SEED.playedAt }: BattleSeed,
  index: number
) => ({
  accountId,
  arenaUniqueId: BigInt(index + 1),
  tankId,
  arenaId: 'map',
  battleType,
  result: 'win' as const,
  damageDealt: 0,
  damageAssistedRadio: 0,
  damageAssistedTrack: 0,
  damageAssistedStun: 0,
  damageBlocked: 0,
  damageReceived: 0,
  spotted: 0,
  frags: 0,
  xp: 0,
  survived: true,
  moePercent,
  moeMovingAvg,
  startedAt
});

describeWithDatabase('moeEstimatePoints', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const seed = async () => {
    await prisma.player.createMany({
      data: [1n, 2n, 3n].map((accountId) => ({ accountId, nickname: `p${accountId}` }))
    });

    await prisma.battle.createMany({
      data: [
        { accountId: 1n, tankId: 1, moePercent: 64, moeMovingAvg: 1000 },
        { accountId: 1n, tankId: 1, moePercent: 66, moeMovingAvg: 1200 },
        { accountId: 1n, tankId: 1, moePercent: 65.5, moeMovingAvg: 1100 },
        { accountId: 1n, tankId: 1, moePercent: 97, moeMovingAvg: 4000 },
        { accountId: 1n, tankId: 1, moePercent: 99, moeMovingAvg: 5000 },
        { accountId: 1n, tankId: 1, moePercent: 75, moeMovingAvg: 1800 },
        { accountId: 2n, tankId: 1, moePercent: 65, moeMovingAvg: 2000 },
        { accountId: 2n, tankId: 1, moePercent: 85, moeMovingAvg: 3000 },
        { accountId: 2n, tankId: 1, moePercent: 86, moeMovingAvg: 3100 },
        { accountId: 3n, tankId: 1, moePercent: 65, moeMovingAvg: 1500 },
        { accountId: 3n, tankId: 1, moePercent: 65, moeMovingAvg: null },
        { accountId: 3n, tankId: 1, moePercent: 65, moeMovingAvg: 0 },
        { accountId: 3n, tankId: 1, moePercent: null, moeMovingAvg: 9000 },
        { accountId: 3n, tankId: 1, moePercent: 65, moeMovingAvg: 9000, battleType: SEED.otherBattleType },
        { accountId: 3n, tankId: 1, moePercent: 65, moeMovingAvg: 9000, startedAt: new Date('2026-09-20T23:59:59Z') },
        { accountId: 1n, tankId: 2, moePercent: 85, moeMovingAvg: 2500 }
      ].map(toBattle)
    });
  };

  it('takes the median across players of each player’s median damage within the band of every step', async () => {
    await seed();

    const rows = await moeEstimatePoints({
      db: prisma.$kysely,
      since: SEED.since,
      steps: SEED.steps,
      band: SEED.band,
      battleType: SEED.randomBattleType
    });

    expect(rows).toEqual([
      { tankId: 1, percent: 65, damage: 1500, players: 3 },
      { tankId: 1, percent: 85, damage: 3050, players: 1 },
      { tankId: 1, percent: 95, damage: 4000, players: 1 },
      { tankId: 1, percent: 100, damage: 5000, players: 1 },
      { tankId: 2, percent: 85, damage: 2500, players: 1 }
    ]);
  });

  it('returns nothing without battles in the window', async () => {
    expect(
      await moeEstimatePoints({ db: prisma.$kysely, since: SEED.since, steps: SEED.steps, band: SEED.band, battleType: SEED.randomBattleType })
    ).toEqual([]);
  });
});
