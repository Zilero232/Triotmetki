import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { recordEvents, tankEvents } from '../snapshot-events.queries';

const SEED = {
  accountId: 1_000_000_101n,
  otherAccountId: 1_000_000_102n,
  tankId: 1,
  otherTankId: 2,
  aceMastery: 4,
  lookback: new Date('2026-08-01T00:00:00Z'),
  since: new Date('2026-09-01T00:00:00Z'),
  until: new Date('2026-10-01T00:00:00Z')
} as const;

const tankSnapshot = ({
  accountId = SEED.accountId,
  tankId = SEED.tankId,
  mode = 'all',
  capturedAt,
  marksOnGun,
  markOfMastery = 0
}: {
  accountId?: bigint;
  tankId?: number;
  mode?: 'all' | 'random';
  capturedAt: string;
  marksOnGun: number | null;
  markOfMastery?: number;
}) => ({
  accountId,
  tankId,
  mode,
  capturedAt: new Date(capturedAt),
  battles: 10,
  wins: 5,
  losses: 5,
  draws: 0,
  damageDealt: 10_000,
  damageReceived: 9_000,
  frags: 5,
  spotted: 5,
  xp: 5_000,
  survived: 3,
  hits: 50,
  shots: 60,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 100,
  markOfMastery,
  marksOnGun
});

const accountSnapshot = ({
  accountId = SEED.accountId,
  mode = 'all',
  capturedAt,
  maxDamage,
  maxDamageTankId = SEED.tankId
}: {
  accountId?: bigint;
  mode?: 'all' | 'random';
  capturedAt: string;
  maxDamage: number | null;
  maxDamageTankId?: number | null;
}) => ({
  accountId,
  mode,
  capturedAt: new Date(capturedAt),
  battles: 100,
  wins: 50,
  losses: 50,
  draws: 0,
  damageDealt: 100_000n,
  damageReceived: 90_000n,
  frags: 50,
  spotted: 50,
  xp: 50_000n,
  survived: 30,
  hits: 500,
  shots: 600,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 100,
  maxDamage,
  maxDamageTankId
});

describeWithDatabase('snapshot events queries', () => {
  const prisma = createTestPrisma();

  const window = {
    db: prisma.$kysely,
    accountIds: [Number(SEED.accountId), Number(SEED.otherAccountId)],
    lookback: SEED.lookback,
    since: SEED.since,
    until: SEED.until
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_snapshot', 'account_snapshot', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: SEED.accountId, nickname: 'first' },
        { accountId: SEED.otherAccountId, nickname: 'second' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('finds mark gains and new aces in the window, newest first, using a baseline from the lookback', async () => {
    await prisma.tankSnapshot.createMany({
      data: [
        tankSnapshot({ capturedAt: '2026-08-15T00:00:00Z', marksOnGun: 1 }),
        tankSnapshot({ capturedAt: '2026-09-05T00:00:00Z', marksOnGun: 2 }),
        tankSnapshot({ capturedAt: '2026-09-10T00:00:00Z', marksOnGun: 2, markOfMastery: 4 }),
        tankSnapshot({ capturedAt: '2026-09-12T00:00:00Z', marksOnGun: 2, markOfMastery: 4 }),
        tankSnapshot({ capturedAt: '2026-10-02T00:00:00Z', marksOnGun: 3, markOfMastery: 4 }),
        tankSnapshot({ tankId: SEED.otherTankId, capturedAt: '2026-09-03T00:00:00Z', marksOnGun: null }),
        tankSnapshot({ tankId: SEED.otherTankId, capturedAt: '2026-09-04T00:00:00Z', marksOnGun: 1 }),
        tankSnapshot({ accountId: SEED.otherAccountId, mode: 'random', capturedAt: '2026-09-03T00:00:00Z', marksOnGun: 0 }),
        tankSnapshot({ accountId: SEED.otherAccountId, mode: 'random', capturedAt: '2026-09-04T00:00:00Z', marksOnGun: 3 }),
        tankSnapshot({ accountId: SEED.otherAccountId, capturedAt: '2026-07-01T00:00:00Z', marksOnGun: 0 }),
        tankSnapshot({ accountId: SEED.otherAccountId, capturedAt: '2026-09-20T00:00:00Z', marksOnGun: 1 })
      ]
    });

    expect(await tankEvents({ ...window, aceMastery: SEED.aceMastery })).toEqual([
      {
        accountId: Number(SEED.accountId),
        tankId: SEED.tankId,
        capturedAt: new Date('2026-09-10T00:00:00Z'),
        marksOnGun: 2,
        prevMarks: 2,
        markOfMastery: 4,
        prevMastery: 0
      },
      {
        accountId: Number(SEED.accountId),
        tankId: SEED.tankId,
        capturedAt: new Date('2026-09-05T00:00:00Z'),
        marksOnGun: 2,
        prevMarks: 1,
        markOfMastery: 0,
        prevMastery: 0
      }
    ]);
  });

  it('finds damage records above the previous snapshot in the window, newest first', async () => {
    await prisma.accountSnapshot.createMany({
      data: [
        accountSnapshot({ capturedAt: '2026-08-20T00:00:00Z', maxDamage: 4_000 }),
        accountSnapshot({ capturedAt: '2026-09-02T00:00:00Z', maxDamage: 4_000 }),
        accountSnapshot({ capturedAt: '2026-09-06T00:00:00Z', maxDamage: 5_200, maxDamageTankId: SEED.otherTankId }),
        accountSnapshot({ capturedAt: '2026-09-08T00:00:00Z', maxDamage: null, maxDamageTankId: null }),
        accountSnapshot({ capturedAt: '2026-09-09T00:00:00Z', maxDamage: 6_000 }),
        accountSnapshot({ capturedAt: '2026-10-03T00:00:00Z', maxDamage: 7_000 }),
        accountSnapshot({ accountId: SEED.otherAccountId, mode: 'random', capturedAt: '2026-09-02T00:00:00Z', maxDamage: 1_000 }),
        accountSnapshot({ accountId: SEED.otherAccountId, mode: 'random', capturedAt: '2026-09-03T00:00:00Z', maxDamage: 2_000 }),
        accountSnapshot({ accountId: SEED.otherAccountId, capturedAt: '2026-08-02T00:00:00Z', maxDamage: 1_000 }),
        accountSnapshot({ accountId: SEED.otherAccountId, capturedAt: '2026-09-21T00:00:00Z', maxDamage: 3_000 })
      ]
    });

    expect(await recordEvents(window)).toEqual([
      {
        accountId: Number(SEED.otherAccountId),
        capturedAt: new Date('2026-09-21T00:00:00Z'),
        maxDamage: 3_000,
        prevMaxDamage: 1_000,
        maxDamageTankId: SEED.tankId
      },
      {
        accountId: Number(SEED.accountId),
        capturedAt: new Date('2026-09-06T00:00:00Z'),
        maxDamage: 5_200,
        prevMaxDamage: 4_000,
        maxDamageTankId: SEED.otherTankId
      }
    ]);
  });
});
