import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { playtimeFromBattles, playtimeFromDeltas } from '../playtime.queries';

const WINDOW = {
  from: new Date('2026-09-28T00:00:00Z'),
  sundayNightUtc: new Date('2026-10-04T22:30:00Z'),
  mondayNoonUtc: new Date('2026-10-05T10:00:00Z'),
  beforeWindow: new Date('2026-09-01T10:00:00Z')
} as const;

const ACCOUNT_ID = Number(STAT_SEED.accountId);

const cells = <Row extends { weekday: number; hour: number }>(rows: Row[]) =>
  sortBy(
    rows,
    (row) => row.weekday,
    (row) => row.hour
  );

describeWithDatabase('playtime queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: STAT_SEED.accountId, nickname: 'owner' },
        { accountId: STAT_SEED.mateId, nickname: 'other' }
      ]
    });

    await prisma.battle.createMany({
      data: [
        battleRow({ arenaUniqueId: 1n, startedAt: WINDOW.sundayNightUtc, result: 'win', damageDealt: 1000 }),
        battleRow({ arenaUniqueId: 2n, startedAt: new Date(WINDOW.sundayNightUtc.getTime() + 900_000), result: 'loss', damageDealt: 500 }),
        battleRow({ arenaUniqueId: 3n, startedAt: WINDOW.mondayNoonUtc, battleType: '22', result: 'win', damageDealt: 2000 }),
        battleRow({ arenaUniqueId: 4n, startedAt: WINDOW.beforeWindow }),
        battleRow({ arenaUniqueId: 5n, startedAt: WINDOW.mondayNoonUtc, accountId: STAT_SEED.mateId })
      ]
    });

    await prisma.tankBattleDelta.createMany({
      data: [
        tankDeltaRow({ capturedAt: WINDOW.sundayNightUtc, battles: 2, wins: 1, damageDealt: 2000 }),
        tankDeltaRow({ capturedAt: WINDOW.sundayNightUtc, tankId: STAT_SEED.otherTankId, battles: 3, wins: 2, damageDealt: 3000 }),
        tankDeltaRow({ capturedAt: WINDOW.sundayNightUtc, mode: 'all', battles: 9, wins: 9, damageDealt: 9000 }),
        tankDeltaRow({ capturedAt: WINDOW.beforeWindow, battles: 7 })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('groups every battle type by Monday-first weekday and Moscow hour for the player page', async () => {
    const rows = await playtimeFromBattles({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from, weekStartsOn: 'monday' });

    expect(cells(rows)).toEqual([
      { weekday: 0, hour: 1, battles: 2, wins: 1, damage: 1500 },
      { weekday: 0, hour: 13, battles: 1, wins: 1, damage: 2000 }
    ]);
  });

  it('groups only random battles by Sunday-first weekday for analytics', async () => {
    const rows = await playtimeFromBattles({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from, weekStartsOn: 'sunday', battleType: '1' });

    expect(cells(rows)).toEqual([{ weekday: 1, hour: 1, battles: 2, wins: 1, damage: 1500 }]);
  });

  it('sums random-mode deltas by Monday-first weekday for the player page', async () => {
    const rows = await playtimeFromDeltas({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from, weekStartsOn: 'monday' });

    expect(cells(rows)).toEqual([{ weekday: 0, hour: 1, battles: 5, wins: 3, damage: 5000 }]);
  });

  it('sums random-mode deltas by Sunday-first weekday for analytics', async () => {
    const rows = await playtimeFromDeltas({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from, weekStartsOn: 'sunday' });

    expect(cells(rows)).toEqual([{ weekday: 1, hour: 1, battles: 5, wins: 3, damage: 5000 }]);
  });

  it('returns no cells for an account without battles', async () => {
    const rows = await playtimeFromBattles({ db: prisma.$kysely, accountId: 42, from: WINDOW.from, weekStartsOn: 'monday' });

    expect(rows).toEqual([]);
  });
});
