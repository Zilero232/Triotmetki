import { addDays, fromUnixTime } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { z } from 'zod';

import type { AccountRating, Player, PlayerTank, TankBattleDelta, TankSnapshotLatest } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { GainedMark } from '../../lib/marks-gain';
import type { AccountChanges, StoredPlayer } from '../../lib/poll-pipeline';
import type { TankSnapshotRow } from '../../lib/snapshots';

import { moscowCalendarDate } from '../../../../../common/lib';
import { ExpectedValuesService } from '../../../../reference';
import { PurgeGuardService } from '../../../purge';
import { TRACKING } from '../../config';
import { accountInfo, block, tankStats } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { tankSnapshotRow } from '../../lib/snapshots';
import { TrackingAnnounceService } from '../tracking-announce.service';
import { TrackingStoreService } from '../tracking-store.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createStore = () => {
  const prisma = mockDeep<PrismaService>();
  const guard = mock<PurgeGuardService>();
  const announce = mock<TrackingAnnounceService>();
  const expected = mock<ExpectedValuesService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  announce.subscribers.mockResolvedValue(new Set());
  expected.all.mockResolvedValue(new Map());

  return { prisma, guard, announce, expected, store: new TrackingStoreService(prisma, guard, announce, expected) };
};

const stored = (fields: Partial<StoredPlayer> = {}): StoredPlayer => ({
  accountId: 1,
  clanId: null,
  lastBattleAt: null,
  lastPolledAt: null,
  trackingTier: 'population',
  ...fields
});

const info = (clanId: number | null) => ({ ...accountInfo({ accountId: 1, battles: 100, lastBattleTime: 1_700_000_000 }), clan_id: clanId });

const snapshot = ({ tankId, marksOnGun }: Pick<TankSnapshotRow, 'marksOnGun' | 'tankId'>): TankSnapshotRow =>
  tankSnapshotRow({ accountId: 1n, capturedAt: NOW, mode: 'all', block: block(10), stats: tankStats({ tankId, battles: 10 }), marksOnGun });

describe('TrackingStoreService.loadPlayers', () => {
  it('converts ids to numbers and keeps a missing clan as null rather than 0', async () => {
    const { prisma, store } = createStore();

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, clanId: null, trackingTier: 'active', lastBattleAt: null, lastPolledAt: null }),
      mock<Player>({ accountId: 2n, clanId: 7n, trackingTier: 'dormant', lastBattleAt: NOW, lastPolledAt: NOW })
    ]);

    const players = await store.loadPlayers([1, 2]);

    expect(players.map(({ accountId, clanId }) => ({ accountId, clanId }))).toEqual([
      { accountId: 1, clanId: null },
      { accountId: 2, clanId: 7 }
    ]);
  });
});

describe('TrackingStoreService.upsertPlayer', () => {
  it('promotes the player to the active tier when asked', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: stored({ trackingTier: 'dormant' }), tier: 'population', promote: true, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ trackingTier: 'active' });
  });

  it('keeps the stored tier of a known player instead of the batch tier', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: stored({ trackingTier: 'active' }), tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ trackingTier: 'active' });
  });

  it('gives a new player the batch tier', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].create).toMatchObject({ trackingTier: 'population' });
  });

  it('converts the account creation time from unix seconds', async () => {
    const { prisma, store } = createStore();
    const current = info(null);

    await store.upsertPlayer({ info: current, previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].create).toMatchObject({ createdAt: fromUnixTime(current.created_at) });
  });

  it('writes only the identity columns the player row keeps', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(Object.keys(prisma.player.upsert.mock.calls[0]?.[0].update ?? {}).sort()).toEqual(['clanId', 'createdAt', 'nickname', 'trackingTier']);
  });

  it('stores when the player left the game and never clears a known logout', async () => {
    const { prisma, store } = createStore();
    const logoutAt = 1_700_000_500;

    await store.upsertPlayer({ info: { ...info(null), logout_at: logoutAt }, previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ logoutAt: fromUnixTime(logoutAt) });
  });

  it('refreshes the nickname last-seen time on every poll', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: stored(), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerNickname.upsert.mock.calls[0]?.[0].update).toEqual({ lastSeenAt: NOW });
  });

  it('writes no clan history when the clan is unchanged', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(5), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('writes no clan history for a new clanless player', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('closes the open membership and opens a new one dated now when a known player switches clan', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(9), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany.mock.calls[0]?.[0]).toMatchObject({ where: { leftAt: null }, data: { leftAt: NOW } });
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: NOW });
  });

  it('only closes the membership when a known player leaves a clan', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(null), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).toHaveBeenCalledOnce();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('records an unknown join date for a new player already in a clan', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayer({ info: info(9), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: null });
  });
});

describe('TrackingStoreService.upsertPlayers', () => {
  it('writes players who kept their clan in one batch with their nicknames', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayers([
      { info: info(5), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW },
      { info: { ...info(null), account_id: 2 }, previous: undefined, tier: 'population', promote: false, now: NOW }
    ]);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.player.upsert).not.toHaveBeenCalled();
  });

  it('keeps a clan switch on the per-player path that records the clan history', async () => {
    const { prisma, store } = createStore();

    await store.upsertPlayers([{ info: info(9), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW }]);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: NOW });
  });

  it('writes an account listed twice only once', async () => {
    const { prisma, store } = createStore();
    const entry = { info: info(9), previous: stored({ clanId: 5 }), tier: 'population' as const, promote: false, now: NOW };

    await store.upsertPlayers([entry, entry]);

    expect(prisma.player.upsert).toHaveBeenCalledOnce();
  });
});

const syncedRowsSchema = z.array(z.object({ account_id: z.number(), next_poll_at: z.string(), last_polled_at: z.string() }));

describe('TrackingStoreService.markSynced', () => {
  const syncedRows = (prisma: ReturnType<typeof createStore>['prisma']) => {
    const sql = prisma.$executeRaw.mock.calls[0]?.[0];
    const json = !sql || 'raw' in sql ? undefined : sql.values.find((value): value is string => typeof value === 'string');

    return json ? syncedRowsSchema.parse(JSON.parse(json)) : [];
  };

  it('writes nothing for players that no longer exist', async () => {
    const { prisma, store } = createStore();

    prisma.player.findMany.mockResolvedValue([]);

    await store.markSynced([{ accountId: 1, lastBattleAt: NOW, now: NOW }]);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('polls an active subscriber sooner than an active non-subscriber in one batched write', async () => {
    const { prisma, announce, store } = createStore();

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, trackingTier: 'active' }),
      mock<Player>({ accountId: 2n, trackingTier: 'active' })
    ]);

    announce.subscribers.mockResolvedValue(new Set([1]));

    await store.markSynced([
      { accountId: 1, lastBattleAt: NOW, now: NOW },
      { accountId: 2, lastBattleAt: NOW, now: NOW }
    ]);

    const [subscriber, regular] = syncedRows(prisma);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(Date.parse(subscriber?.next_poll_at ?? '')).toBeLessThan(Date.parse(regular?.next_poll_at ?? ''));
    expect(subscriber?.last_polled_at).toBe(NOW.toISOString());
  });

  it('does not treat a subscriber outside the active tier as one', async () => {
    const subscribed = createStore();
    const plain = createStore();

    for (const { prisma } of [subscribed, plain]) {
      prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, trackingTier: 'population' })]);
    }

    subscribed.announce.subscribers.mockResolvedValue(new Set([1]));
    plain.announce.subscribers.mockResolvedValue(new Set());

    await subscribed.store.markSynced([{ accountId: 1, lastBattleAt: null, now: NOW }]);
    await plain.store.markSynced([{ accountId: 1, lastBattleAt: null, now: NOW }]);

    expect(syncedRows(subscribed.prisma)).toEqual(syncedRows(plain.prisma));
  });
});

describe('TrackingStoreService.markMissing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parks missing accounts as dormant until the dormant interval passes', async () => {
    const { prisma, store } = createStore();

    await store.markMissing([1, 2]);

    expect(prisma.player.updateMany.mock.calls[0]?.[0].data).toEqual({
      trackingTier: 'dormant',
      nextPollAt: addDays(NOW, TRACKING.intervals.dormantDays)
    });
  });
});

describe('TrackingStoreService.accountStore latestAccountBattles', () => {
  it('keeps only the snapshot modes and drops anything else the query returns', async () => {
    const { prisma, store } = createStore();

    prisma.$queryRaw.mockResolvedValue([
      { mode: 'all', battles: 120 },
      { mode: 'random', battles: 100 },
      { mode: 'ranked', battles: 5 }
    ]);

    const battles = await store.accountStore({ tx: prisma, expected: new Map(), gained: [] }).latestAccountBattles(1);

    expect(Object.fromEntries(battles)).toEqual({ all: 120, random: 100 });
  });
});

describe('TrackingStoreService.loadBaselines', () => {
  it('returns an entry for every requested account, empty for one without tanks', async () => {
    const { prisma, store } = createStore();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, battles: 5, markOfMastery: 2 })]);

    const baselines = await store.loadBaselines([1, 2]);

    expect(baselines.get(1)).toEqual([{ tankId: 10, battles: 5, markOfMastery: 2 }]);
    expect(baselines.get(2)).toEqual([]);
  });
});

describe('TrackingStoreService.accountStore latestTankSnapshots', () => {
  it('reads the latest row per tank and snapshot mode from the retention-proof table', async () => {
    const { prisma, store } = createStore();
    const row = mock<TankSnapshotLatest>({ tankId: 10 });

    prisma.tankSnapshotLatest.findMany.mockResolvedValue([row]);

    expect(await store.accountStore({ tx: prisma, expected: new Map(), gained: [] }).latestTankSnapshots({ accountId: 1, tankIds: [10] })).toEqual([
      row
    ]);

    expect(prisma.tankSnapshot.findMany).not.toHaveBeenCalled();
  });
});

describe('TrackingStoreService.overallWn8', () => {
  it('returns null when the account has no overall rating yet', async () => {
    const { prisma, store } = createStore();

    prisma.accountRating.findUnique.mockResolvedValue(null);

    expect(await store.overallWn8(1)).toBeNull();
  });

  it('keeps a zero rating as zero', async () => {
    const { prisma, store } = createStore();

    prisma.accountRating.findUnique.mockResolvedValue(mock<AccountRating>({ wn8: 0 }));

    expect(await store.overallWn8(1)).toBe(0);
  });
});

describe('TrackingStoreService.withAccount', () => {
  it('runs the account writes inside the per-account advisory lock', async () => {
    const { prisma, store } = createStore();

    await store.withAccount({ accountId: 42, run: async () => 'done' });

    expect(prisma.$executeRaw.mock.calls[0]?.slice(1)).toEqual([TRACKING.lock.scope, '42']);
  });

  it('announces the marks gained inside the transaction only after it commits', async () => {
    const { prisma, announce, store } = createStore();
    const committed = vi.fn();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);

    prisma.$transaction.mockImplementation(async (run) => {
      const result = typeof run === 'function' ? await run(prisma) : await Promise.all(run);

      committed();

      return result;
    });

    announce.announceMarks.mockImplementation(async () => {
      expect(committed).toHaveBeenCalled();
    });

    await store.withAccount({
      accountId: 1,
      run: async (account) =>
        account.writeAccountChanges({
          accountId: 1,
          accountSnapshots: [],
          deltas: [],
          baseline: [],
          tankSnapshots: [snapshot({ tankId: 10, marksOnGun: 2 })]
        })
    });

    expect(announce.announceMarks).toHaveBeenCalledWith([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
  });

  it('announces nothing when the account transaction rolls back', async () => {
    const { prisma, announce, store } = createStore();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);
    prisma.tankBattleDelta.createMany.mockRejectedValue(new Error('timeout'));

    await expect(
      store.withAccount({
        accountId: 1,
        run: async (account) =>
          account.writeAccountChanges({
            accountId: 1,
            accountSnapshots: [],
            deltas: [],
            baseline: [],
            tankSnapshots: [snapshot({ tankId: 10, marksOnGun: 2 })]
          })
      })
    ).rejects.toThrow('timeout');

    expect(announce.announceMarks).not.toHaveBeenCalled();
  });
});

describe('TrackingStoreService.accountStore writeAccountChanges', () => {
  const changes = { accountId: 1, accountSnapshots: [], deltas: [], baseline: [] };

  const write = async (input: Partial<AccountChanges>) => {
    const created = createStore();
    const gained: GainedMark[] = [];

    await created.store
      .accountStore({ tx: created.prisma, expected: new Map(), gained })
      .writeAccountChanges({ ...changes, tankSnapshots: [], ...input });

    return { ...created, gained };
  };

  it('does not look up stored marks when no snapshot carries marks', async () => {
    const { prisma, announce, gained } = await write({ tankSnapshots: [snapshot({ tankId: 10, marksOnGun: null })] });

    expect(prisma.playerTank.findMany).not.toHaveBeenCalled();
    expect(gained).toEqual([]);
    expect(announce.announceMarks).not.toHaveBeenCalled();
  });

  it('writes snapshots and deltas idempotently so a retried poll persists them once', async () => {
    const { prisma } = await write({});

    for (const createMany of [prisma.accountSnapshot.createMany, prisma.tankSnapshot.createMany, prisma.tankBattleDelta.createMany]) {
      expect(createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true });
    }
  });

  it('collects only a real gain over a known value for the post-commit outbox', async () => {
    const created = createStore();
    const gained: GainedMark[] = [];

    created.prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 }),
      mock<PlayerTank>({ accountId: 1n, tankId: 11, marksOnGun: null }),
      mock<PlayerTank>({ accountId: 1n, tankId: 12, marksOnGun: 3 })
    ]);

    await created.store.accountStore({ tx: created.prisma, expected: new Map(), gained }).writeAccountChanges({
      ...changes,
      tankSnapshots: [
        snapshot({ tankId: 10, marksOnGun: 1 }),
        snapshot({ tankId: 10, marksOnGun: 2 }),
        snapshot({ tankId: 11, marksOnGun: 1 }),
        snapshot({ tankId: 12, marksOnGun: 3 })
      ]
    });

    expect(gained).toEqual([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
    expect(created.announce.announceMarks).not.toHaveBeenCalled();
  });

  it('refreshes the latest-snapshot table whenever tank snapshots are written', async () => {
    const { prisma } = await write({ tankSnapshots: [snapshot({ tankId: 10, marksOnGun: null })] });

    expect(prisma.$executeRaw.mock.calls.some(([sql]) => !('raw' in sql) && sql.sql.includes('tank_snapshot_latest'))).toBe(true);
  });

  it('rebuilds the api day session only when the write carries deltas', async () => {
    const quiet = await write({});

    expect(quiet.prisma.playSession.upsert).not.toHaveBeenCalled();

    const delta = mock<TankBattleDelta>({ accountId: 1n, tankId: 10, mode: 'random', capturedAt: NOW, battles: 2, wins: 1 });
    const created = createStore();

    created.prisma.tankBattleDelta.findMany.mockResolvedValue([delta]);

    await created.store
      .accountStore({ tx: created.prisma, expected: new Map(), gained: [] })
      .writeAccountChanges({ ...changes, tankSnapshots: [], deltas: [delta] });

    expect(created.prisma.playSession.upsert.mock.calls[0]?.[0].where).toEqual({
      accountId_source_kind_day: { accountId: 1n, source: 'api', kind: 'day', day: moscowCalendarDate(NOW) }
    });
  });
});

describe('TrackingStoreService.accountStore Lesta marks', () => {
  it('writes every Lesta mark it is handed, even for a tank without a new snapshot', async () => {
    const created = createStore();

    created.prisma.playerTank.findMany.mockResolvedValue([]);

    await created.store.accountStore({ tx: created.prisma, expected: new Map(), gained: [] }).writeAccountChanges({
      accountId: 1,
      accountSnapshots: [],
      deltas: [],
      baseline: [],
      tankSnapshots: [],
      lestaMarks: [{ accountId: 1n, tankId: 10, marks: 0 }]
    });

    const marksWrite = created.prisma.$executeRaw.mock.calls.find(([sql]) => !('raw' in sql) && sql.sql.includes('marks_source'));

    expect(marksWrite).toBeDefined();
  });

  it('announces a gain measured against the Lesta marks it is handed', async () => {
    const created = createStore();
    const gained: GainedMark[] = [];

    created.prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);

    await created.store.accountStore({ tx: created.prisma, expected: new Map(), gained }).writeAccountChanges({
      accountId: 1,
      accountSnapshots: [],
      deltas: [],
      baseline: [],
      tankSnapshots: [],
      lestaMarks: [{ accountId: 1n, tankId: 10, marks: 2 }]
    });

    expect(gained).toEqual([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
  });
});
