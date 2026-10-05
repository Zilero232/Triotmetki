import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import type { Prisma } from '../../../../../generated';

import { STAT_SEED } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { WATCHLIST_DIGEST_RUN } from '../../config/queue.constants';
import { watchlistQueries } from '../../providers/watchlist-queries.provider';
import { WatchlistActivityReaderService } from '../watchlist-activity-reader.service';

const WINDOW = {
  since: new Date('2026-10-01T00:00:00Z'),
  after: new Date('2026-10-02T10:00:00Z'),
  before: new Date('2026-09-30T10:00:00Z'),
  earlier: new Date('2026-09-29T10:00:00Z')
} as const;

const QUIET_ID = 1_000_000_009n;

const snapshotRow = (
  overrides: Pick<Prisma.TankSnapshotCreateManyInput, 'accountId' | 'capturedAt' | 'marksOnGun' | 'tankId'> &
    Partial<Prisma.TankSnapshotCreateManyInput>
) =>
  ({
    mode: 'random',
    battles: 10,
    wins: 5,
    losses: 5,
    draws: 0,
    damageDealt: 10_000,
    damageReceived: 8000,
    frags: 5,
    spotted: 5,
    xp: 5000,
    survived: 3,
    hits: 50,
    shots: 60,
    capturePoints: 0,
    droppedCapturePoints: 0,
    avgDamageBlocked: 100,
    markOfMastery: 0,
    ...overrides
  }) satisfies Prisma.TankSnapshotCreateManyInput;

const sessionRow = (overrides: Partial<Prisma.PlaySessionCreateManyInput> & { accountId: bigint; lastActivityAt: Date }) =>
  ({
    source: 'api',
    kind: 'day',
    startedAt: overrides.lastActivityAt,
    battles: 4,
    wins: 2,
    damageDealt: 6000,
    ...overrides
  }) satisfies Prisma.PlaySessionCreateManyInput;

describeWithDatabase('WatchlistActivityReaderService.activity', () => {
  const prisma = createTestPrisma();
  const service = new WatchlistActivityReaderService(prisma, watchlistQueries);

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['play_session', 'tank_snapshot', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: STAT_SEED.accountId, nickname: 'first' },
        { accountId: STAT_SEED.mateId, nickname: 'second' },
        { accountId: QUIET_ID, nickname: 'quiet' }
      ]
    });

    await prisma.playSession.createMany({
      data: [
        sessionRow({ accountId: STAT_SEED.accountId, lastActivityAt: WINDOW.after }),
        sessionRow({ accountId: STAT_SEED.accountId, lastActivityAt: new Date('2026-10-03T10:00:00Z'), battles: 1, wins: 1, damageDealt: 500 }),
        sessionRow({ accountId: STAT_SEED.accountId, lastActivityAt: WINDOW.after, source: 'mod', battles: 50 }),
        sessionRow({ accountId: STAT_SEED.accountId, lastActivityAt: WINDOW.before, battles: 60 }),
        sessionRow({ accountId: STAT_SEED.accountId, lastActivityAt: WINDOW.after, battles: 0, wins: 0, damageDealt: 0 }),
        sessionRow({ accountId: STAT_SEED.mateId, lastActivityAt: WINDOW.after, battles: 2, wins: 0, damageDealt: 1000 })
      ]
    });

    await prisma.tankSnapshot.createMany({
      data: [
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 1, capturedAt: WINDOW.earlier, marksOnGun: 2 }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 1, capturedAt: WINDOW.before, marksOnGun: 1 }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 1, capturedAt: WINDOW.after, marksOnGun: 2 }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 2, capturedAt: WINDOW.before, marksOnGun: 2 }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 2, capturedAt: WINDOW.after, marksOnGun: 2 }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 3, capturedAt: WINDOW.after, marksOnGun: 3 }),
        snapshotRow({
          accountId: STAT_SEED.accountId,
          tankId: 4,
          capturedAt: subDays(WINDOW.since, WATCHLIST_DIGEST_RUN.marksLookbackDays + 1),
          marksOnGun: 0
        }),
        snapshotRow({ accountId: STAT_SEED.accountId, tankId: 4, capturedAt: WINDOW.after, marksOnGun: 1 }),
        snapshotRow({ accountId: STAT_SEED.mateId, tankId: 1, capturedAt: WINDOW.before, marksOnGun: 0 }),
        snapshotRow({ accountId: STAT_SEED.mateId, tankId: 1, capturedAt: WINDOW.after, marksOnGun: 1 }),
        snapshotRow({ accountId: STAT_SEED.mateId, tankId: 2, capturedAt: WINDOW.before, marksOnGun: 0, mode: 'all' }),
        snapshotRow({ accountId: STAT_SEED.mateId, tankId: 2, capturedAt: WINDOW.after, marksOnGun: 1, mode: 'all' })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sums api sessions with battles since the window start and counts marks gained over the latest earlier mark', async () => {
    const activity = await service.activity({ accountIds: [STAT_SEED.accountId, STAT_SEED.mateId], since: WINDOW.since });

    expect([...activity.values()]).toEqual([
      { accountId: STAT_SEED.accountId, battles: 5, wins: 3, damage: 6500, lastBattleAt: new Date('2026-10-03T10:00:00Z'), marksGained: 1 },
      { accountId: STAT_SEED.mateId, battles: 2, wins: 0, damage: 1000, lastBattleAt: WINDOW.after, marksGained: 1 }
    ]);
  });

  it('reports zeros for a followed account with no activity', async () => {
    const activity = await service.activity({ accountIds: [QUIET_ID], since: WINDOW.since });

    expect(activity.get(QUIET_ID)).toEqual({ accountId: QUIET_ID, battles: 0, wins: 0, damage: 0, lastBattleAt: null, marksGained: 0 });
  });
});
