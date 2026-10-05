import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { wrappedBestBattle, wrappedBusiestMonth, wrappedTopTanks } from '../wrapped.queries';

const SEED = {
  accountId: 1_000_000_201n,
  otherAccountId: 1_000_000_202n,
  start: new Date('2025-01-01T00:00:00Z'),
  end: new Date('2026-01-01T00:00:00Z')
} as const;

const tankSnapshot = ({
  accountId = SEED.accountId,
  tankId,
  mode = 'all',
  capturedAt,
  battles,
  damageDealt
}: {
  accountId?: bigint;
  tankId: number;
  mode?: 'all' | 'random';
  capturedAt: string;
  battles: number;
  damageDealt: number;
}) => ({
  accountId,
  tankId,
  mode,
  capturedAt: new Date(capturedAt),
  battles,
  wins: 0,
  losses: 0,
  draws: 0,
  damageDealt,
  damageReceived: 0,
  frags: 0,
  spotted: 0,
  xp: 0,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 0,
  markOfMastery: 0,
  marksOnGun: null
});

const daySession = ({ accountId = SEED.accountId, startedAt, battles }: { accountId?: bigint; startedAt: string; battles: number }) => ({
  accountId,
  source: 'api' as const,
  kind: 'day' as const,
  startedAt: new Date(startedAt),
  battles
});

describeWithDatabase('wrapped queries', () => {
  const prisma = createTestPrisma();
  const range = { db: prisma.$kysely, accountId: Number(SEED.accountId), start: SEED.start, end: SEED.end };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_snapshot', 'play_session', 'battle', 'player'] });

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

  it('ranks the tanks by battles played inside the year and skips tanks with no new battles', async () => {
    await prisma.tankSnapshot.createMany({
      data: [
        tankSnapshot({ tankId: 1, capturedAt: '2025-02-01T00:00:00Z', battles: 10, damageDealt: 10_000 }),
        tankSnapshot({ tankId: 1, capturedAt: '2025-06-01T00:00:00Z', battles: 13, damageDealt: 14_500 }),
        tankSnapshot({ tankId: 2, capturedAt: '2025-03-01T00:00:00Z', battles: 5, damageDealt: 3_000 }),
        tankSnapshot({ tankId: 2, capturedAt: '2025-12-31T23:00:00Z', battles: 25, damageDealt: 33_000 }),
        tankSnapshot({ tankId: 3, capturedAt: '2025-03-01T00:00:00Z', battles: 7, damageDealt: 7_000 }),
        tankSnapshot({ tankId: 3, capturedAt: '2025-04-01T00:00:00Z', battles: 7, damageDealt: 7_000 }),
        tankSnapshot({ tankId: 4, capturedAt: '2025-03-01T00:00:00Z', battles: 1, damageDealt: 100 }),
        tankSnapshot({ tankId: 4, capturedAt: '2026-01-01T00:00:00Z', battles: 90, damageDealt: 90_000 }),
        tankSnapshot({ tankId: 5, mode: 'random', capturedAt: '2025-03-01T00:00:00Z', battles: 1, damageDealt: 100 }),
        tankSnapshot({ tankId: 5, mode: 'random', capturedAt: '2025-04-01T00:00:00Z', battles: 90, damageDealt: 90_000 }),
        tankSnapshot({ accountId: SEED.otherAccountId, tankId: 1, capturedAt: '2025-03-01T00:00:00Z', battles: 1, damageDealt: 100 }),
        tankSnapshot({ accountId: SEED.otherAccountId, tankId: 1, capturedAt: '2025-04-01T00:00:00Z', battles: 90, damageDealt: 9_000 })
      ]
    });

    expect(await wrappedTopTanks({ ...range, limit: 5 })).toEqual([
      { tankId: 2, battles: 20, damage: 30_000 },
      { tankId: 1, battles: 3, damage: 4_500 }
    ]);
  });

  it('keeps only as many tanks as the limit', async () => {
    await prisma.tankSnapshot.createMany({
      data: [
        tankSnapshot({ tankId: 1, capturedAt: '2025-02-01T00:00:00Z', battles: 10, damageDealt: 10_000 }),
        tankSnapshot({ tankId: 1, capturedAt: '2025-06-01T00:00:00Z', battles: 13, damageDealt: 14_500 }),
        tankSnapshot({ tankId: 2, capturedAt: '2025-03-01T00:00:00Z', battles: 5, damageDealt: 3_000 }),
        tankSnapshot({ tankId: 2, capturedAt: '2025-12-01T00:00:00Z', battles: 25, damageDealt: 33_000 })
      ]
    });

    expect(await wrappedTopTanks({ ...range, limit: 1 })).toEqual([{ tankId: 2, battles: 20, damage: 30_000 }]);
  });

  it('picks the month with the most session battles inside the year', async () => {
    await prisma.playSession.createMany({
      data: [
        daySession({ startedAt: '2025-03-02T10:00:00Z', battles: 10 }),
        daySession({ startedAt: '2025-03-20T10:00:00Z', battles: 10 }),
        daySession({ startedAt: '2025-07-01T10:00:00Z', battles: 15 }),
        daySession({ startedAt: '2026-01-05T10:00:00Z', battles: 100 }),
        daySession({ accountId: SEED.otherAccountId, startedAt: '2025-05-05T10:00:00Z', battles: 100 })
      ]
    });

    expect(await wrappedBusiestMonth(range)).toEqual({ monthStart: new Date('2025-02-28T21:00:00Z'), battles: 20 });
  });

  it('buckets the sessions by Moscow month, so a late-evening UTC session counts for the next month', async () => {
    await prisma.playSession.createMany({
      data: [
        daySession({ startedAt: '2025-03-31T22:00:00Z', battles: 10 }),
        daySession({ startedAt: '2025-04-30T20:00:00Z', battles: 10 }),
        daySession({ startedAt: '2025-03-15T10:00:00Z', battles: 15 })
      ]
    });

    expect(await wrappedBusiestMonth(range)).toEqual({ monthStart: new Date('2025-03-31T21:00:00Z'), battles: 20 });
  });

  it('breaks a tie between months by the earlier month', async () => {
    await prisma.playSession.createMany({
      data: [daySession({ startedAt: '2025-09-10T10:00:00Z', battles: 10 }), daySession({ startedAt: '2025-02-10T10:00:00Z', battles: 10 })]
    });

    expect(await wrappedBusiestMonth(range)).toEqual({ monthStart: new Date('2025-01-31T21:00:00Z'), battles: 10 });
  });

  it('has no busiest month without sessions', async () => {
    expect(await wrappedBusiestMonth(range)).toBeUndefined();
  });

  it('picks the highest-damage battle of the year and breaks a tie by the earlier battle', async () => {
    await prisma.battle.createMany({
      data: [
        battleRow({
          accountId: SEED.accountId,
          arenaUniqueId: 1n,
          battleType: '22',
          startedAt: new Date('2025-08-01T10:00:00Z'),
          damageDealt: 5_000
        }),
        battleRow({
          accountId: SEED.accountId,
          arenaUniqueId: 2n,
          battleType: '22',
          startedAt: new Date('2025-02-01T10:00:00Z'),
          damageDealt: 5_000
        }),
        battleRow({ accountId: SEED.accountId, arenaUniqueId: 3n, battleType: '22', startedAt: new Date('2026-01-02T10:00:00Z'), damageDealt: 9_000 })
      ]
    });

    expect(await wrappedBestBattle(range)).toMatchObject({ arenaUniqueId: 2, damageDealt: 5_000 });
  });
});
