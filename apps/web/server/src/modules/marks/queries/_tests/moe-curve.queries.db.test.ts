import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { moeCurve } from '../moe-curve.queries';

const SINCE = new Date('2026-09-20T00:00:00.000Z');
const INSIDE = new Date('2026-09-25T12:00:00.000Z');
const BATTLE_TYPE = '1';
const STEPS = [20, 65, 70, 75];
const BAND = 1;
const OTHER_TANK = 2;

const ACCOUNTS = [1n, 2n, 3n, 4n, 5n] as const;

let arena = 0n;

const battle = (overrides: Partial<Parameters<typeof battleRow>[0]>) => {
  arena += 1n;

  return battleRow({ arenaUniqueId: arena, startedAt: INSIDE, battleType: BATTLE_TYPE, ...overrides });
};

describeWithDatabase('moeCurve', () => {
  const prisma = createTestPrisma();

  const read = () => moeCurve({ db: prisma.$kysely, tankId: STAT_SEED.tankId, since: SINCE, steps: STEPS, band: BAND, battleType: BATTLE_TYPE });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });
    await prisma.player.createMany({ data: ACCOUNTS.map((accountId) => ({ accountId, nickname: `p${accountId}` })) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('answers the median of the per-player medians, the players and the battles of every step', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ accountId: 1n, moePercent: 70.5, moeMovingAvg: 2_000 }),
        battle({ accountId: 1n, moePercent: 69.2, moeMovingAvg: 2_100 }),
        battle({ accountId: 2n, moePercent: 71, moeMovingAvg: 2_400 }),
        battle({ accountId: 3n, moePercent: 70, moeMovingAvg: 3_000 }),
        battle({ accountId: 4n, moePercent: 64, moeMovingAvg: 1_800 }),
        battle({ accountId: 4n, moePercent: 66, moeMovingAvg: 1_900 }),
        battle({ accountId: 5n, moePercent: 65, moeMovingAvg: 1_950 }),
        battle({ accountId: 1n, moePercent: 20, moeMovingAvg: 500 })
      ]
    });

    expect(await read()).toEqual([
      { percent: 20, damage: 500, players: 1, battles: 1 },
      { percent: 65, damage: 1_900, players: 2, battles: 3 },
      { percent: 70, damage: 2_400, players: 3, battles: 4 }
    ]);
  });

  it('skips battles outside the band, the tank, the battle type or the window and battles without a usable average', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ accountId: 1n, moePercent: 72.5, moeMovingAvg: 2_000 }),
        battle({ accountId: 1n, moePercent: 70, moeMovingAvg: 2_000, tankId: OTHER_TANK }),
        battle({ accountId: 1n, moePercent: 70, moeMovingAvg: 2_000, battleType: '7' }),
        battle({ accountId: 1n, moePercent: 70, moeMovingAvg: 2_000, startedAt: new Date('2026-09-19T23:59:59.000Z') }),
        battle({ accountId: 1n, moePercent: null, moeMovingAvg: 2_000 }),
        battle({ accountId: 1n, moePercent: 70, moeMovingAvg: null }),
        battle({ accountId: 1n, moePercent: 70, moeMovingAvg: 0 })
      ]
    });

    expect(await read()).toEqual([]);
  });

  it('counts a battle on the edge of the band and one started exactly at the window start', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ accountId: 1n, moePercent: 76, moeMovingAvg: 2_600 }),
        battle({ accountId: 2n, moePercent: 74, moeMovingAvg: 2_800, startedAt: SINCE })
      ]
    });

    expect(await read()).toEqual([{ percent: 75, damage: 2_700, players: 2, battles: 2 }]);
  });
});
