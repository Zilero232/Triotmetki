import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { STAT_SEED, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { activityDays, tankDeltaBuckets, tankDeltaTotals } from '../player-history.queries';

const WINDOW = {
  from: new Date('2026-10-01T00:00:00Z'),
  to: new Date('2026-10-06T00:00:00Z'),
  epoch: new Date(0)
} as const;

const DELTA = {
  saturday: new Date('2026-10-03T10:00:00Z'),
  mondayNight: new Date('2026-10-04T22:30:00Z'),
  mondayNoon: new Date('2026-10-05T10:00:00Z'),
  tuesday: new Date('2026-10-06T10:00:00Z'),
  september: new Date('2026-09-01T10:00:00Z')
} as const;

const ACCOUNT_ID = Number(STAT_SEED.accountId);

const byBucket = <Row extends { bucket: Date; tank_id: number }>(rows: Row[]) =>
  sortBy(
    rows,
    (row) => row.bucket.getTime(),
    (row) => row.tank_id
  );

describeWithDatabase('history queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_battle_delta'] });

    await prisma.tankBattleDelta.createMany({
      data: [
        tankDeltaRow({ capturedAt: DELTA.mondayNight, battles: 2, wins: 1, damageDealt: 2000 }),
        tankDeltaRow({ capturedAt: DELTA.mondayNoon, battles: 3, wins: 2, damageDealt: 3000 }),
        tankDeltaRow({ capturedAt: DELTA.saturday, tankId: STAT_SEED.otherTankId, battles: 1, wins: 0, damageDealt: 500 }),
        tankDeltaRow({ capturedAt: DELTA.tuesday, battles: 4, wins: 4, damageDealt: 4000 }),
        tankDeltaRow({ capturedAt: DELTA.september, battles: 10, wins: 5, damageDealt: 10_000 }),
        tankDeltaRow({ capturedAt: DELTA.mondayNoon, mode: 'all', battles: 50 }),
        tankDeltaRow({ capturedAt: DELTA.mondayNoon, accountId: STAT_SEED.mateId, battles: 60 })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('buckets the player history per Moscow day and tank inside the window', async () => {
    const rows = await tankDeltaBuckets({ db: prisma.$kysely, accountId: ACCOUNT_ID, granularity: 'day', from: WINDOW.from, to: WINDOW.to });

    expect(byBucket(rows)).toEqual([
      { bucket: new Date('2026-10-02T21:00:00Z'), tank_id: 2, battles: 1, wins: 0, damage: 500, frags: 2, spotted: 3, def: 5, cap: 4, survived: 1 },
      { bucket: new Date('2026-10-04T21:00:00Z'), tank_id: 1, battles: 5, wins: 3, damage: 5000, frags: 4, spotted: 6, def: 10, cap: 8, survived: 2 }
    ]);
  });

  it('buckets the analytics trend per Moscow week with no upper bound', async () => {
    const rows = await tankDeltaBuckets({ db: prisma.$kysely, accountId: ACCOUNT_ID, granularity: 'week', from: WINDOW.from });

    expect(byBucket(rows)).toEqual([
      { bucket: new Date('2026-09-27T21:00:00Z'), tank_id: 2, battles: 1, wins: 0, damage: 500, frags: 2, spotted: 3, cap: 4, def: 5, survived: 1 },
      { bucket: new Date('2026-10-04T21:00:00Z'), tank_id: 1, battles: 9, wins: 7, damage: 9000, frags: 6, spotted: 9, cap: 12, def: 15, survived: 3 }
    ]);
  });

  it('narrows the analytics trend to one tank', async () => {
    const rows = await tankDeltaBuckets({
      db: prisma.$kysely,
      accountId: ACCOUNT_ID,
      granularity: 'week',
      from: WINDOW.from,
      tankId: STAT_SEED.otherTankId
    });

    expect(rows.map((row) => row.tank_id)).toEqual([STAT_SEED.otherTankId]);
  });

  it('sums the window per tank', async () => {
    const rows = await tankDeltaTotals({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from });

    expect(sortBy(rows, (row) => row.tank_id)).toEqual([
      { tank_id: 1, battles: 9, wins: 7, damage: 9000, frags: 6, spotted: 9, cap: 12, def: 15, survived: 3 },
      { tank_id: 2, battles: 1, wins: 0, damage: 500, frags: 2, spotted: 3, cap: 4, def: 5, survived: 1 }
    ]);
  });

  it('sums all time from the epoch', async () => {
    const rows = await tankDeltaTotals({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.epoch });

    expect(rows.find((row) => row.tank_id === STAT_SEED.tankId)?.battles).toBe(19);
  });

  it('counts battles and wins per Moscow day in order', async () => {
    const rows = await activityDays({ db: prisma.$kysely, accountId: ACCOUNT_ID, from: WINDOW.from });

    expect(rows).toEqual([
      { day: '2026-10-03', battles: 1, wins: 0 },
      { day: '2026-10-05', battles: 5, wins: 3 },
      { day: '2026-10-06', battles: 4, wins: 4 }
    ]);
  });
});
