import { addDays, fromUnixTime } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Player } from '../../../../../../generated';
import type { StoredPlayer } from '../../lib/poll-pipeline/poll-pipeline.types';
import type { PlayerQueries, SyncedRow } from '../../queries/players.types';

import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { TRACKING } from '../../config/tracking.constants';
import { accountInfo } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { PlayerWriterService } from '../player-writer.service';
import { TrackingAnnounceService } from '../tracking-announce.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createWriter = () => {
  const prisma = mockPrismaService();
  const announce = mock<TrackingAnnounceService>();
  const queries = mock<PlayerQueries>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  announce.subscribers.mockResolvedValue(new Set());

  return { prisma, announce, queries, writer: new PlayerWriterService(prisma, announce, queries) };
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

describe('PlayerWriterService.loadPlayers', () => {
  it('converts ids to numbers and keeps a missing clan as null rather than 0', async () => {
    const { prisma, writer } = createWriter();

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, clanId: null, trackingTier: 'active', lastBattleAt: null, lastPolledAt: null }),
      mock<Player>({ accountId: 2n, clanId: 7n, trackingTier: 'dormant', lastBattleAt: NOW, lastPolledAt: NOW })
    ]);

    const players = await writer.loadPlayers([1, 2]);

    expect(players.map(({ accountId, clanId }) => ({ accountId, clanId }))).toEqual([
      { accountId: 1, clanId: null },
      { accountId: 2, clanId: 7 }
    ]);
  });
});

describe('PlayerWriterService.upsertPlayer', () => {
  it('promotes the player to the active tier when asked', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: stored({ trackingTier: 'dormant' }), tier: 'population', promote: true, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ trackingTier: 'active' });
  });

  it('keeps the stored tier of a known player instead of the batch tier', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: stored({ trackingTier: 'active' }), tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ trackingTier: 'active' });
  });

  it('gives a new player the batch tier', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].create).toMatchObject({ trackingTier: 'population' });
  });

  it('converts the account creation time from unix seconds', async () => {
    const { prisma, writer } = createWriter();
    const current = info(null);

    await writer.upsertPlayer({ info: current, previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].create).toMatchObject({ createdAt: fromUnixTime(current.created_at) });
  });

  it('writes only the identity columns the player row keeps', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(Object.keys(prisma.player.upsert.mock.calls[0]?.[0].update ?? {}).sort()).toEqual(['clanId', 'createdAt', 'nickname', 'trackingTier']);
  });

  it('stores when the player left the game and never clears a known logout', async () => {
    const { prisma, writer } = createWriter();
    const logoutAt = 1_700_000_500;

    await writer.upsertPlayer({ info: { ...info(null), logout_at: logoutAt }, previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.player.upsert.mock.calls[0]?.[0].update).toMatchObject({ logoutAt: fromUnixTime(logoutAt) });
  });

  it('refreshes the nickname last-seen time on every poll', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: stored(), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerNickname.upsert.mock.calls[0]?.[0].update).toEqual({ lastSeenAt: NOW });
  });

  it('writes no clan history when the clan is unchanged', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(5), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('writes no clan history for a new clanless player', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('closes the open membership and opens a new one dated now when a known player switches clan', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(9), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany.mock.calls[0]?.[0]).toMatchObject({ where: { leftAt: null }, data: { leftAt: NOW } });
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: NOW });
  });

  it('only closes the membership when a known player leaves a clan', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(null), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).toHaveBeenCalledOnce();
    expect(prisma.playerClanHistory.create).not.toHaveBeenCalled();
  });

  it('records an unknown join date for a new player already in a clan', async () => {
    const { prisma, writer } = createWriter();

    await writer.upsertPlayer({ info: info(9), previous: undefined, tier: 'population', promote: false, now: NOW });

    expect(prisma.playerClanHistory.updateMany).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: null });
  });
});

describe('PlayerWriterService.upsertPlayers', () => {
  it('writes players who kept their clan in one batch with their nicknames', async () => {
    const { prisma, queries, writer } = createWriter();

    await writer.upsertPlayers([
      { info: info(5), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW },
      { info: { ...info(null), account_id: 2 }, previous: undefined, tier: 'population', promote: false, now: NOW }
    ]);

    expect(queries.upsertPlayers.mock.calls[0]?.[0].rows.map((row) => row.accountId)).toEqual([1n, 2n]);
    expect(queries.touchNicknames.mock.calls[0]?.[0].rows.map((row) => row.seenAt)).toEqual([NOW, NOW]);
    expect(prisma.player.upsert).not.toHaveBeenCalled();
  });

  it('keeps a clan switch on the per-player path that records the clan history', async () => {
    const { prisma, queries, writer } = createWriter();

    await writer.upsertPlayers([{ info: info(9), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW }]);

    expect(queries.upsertPlayers).not.toHaveBeenCalled();
    expect(prisma.playerClanHistory.create.mock.calls[0]?.[0].data).toMatchObject({ clanId: 9n, joinedAt: NOW });
  });

  it('writes an account listed twice only once', async () => {
    const { prisma, writer } = createWriter();
    const entry = { info: info(9), previous: stored({ clanId: 5 }), tier: 'population' as const, promote: false, now: NOW };

    await writer.upsertPlayers([entry, entry]);

    expect(prisma.player.upsert).toHaveBeenCalledOnce();
  });
});

describe('PlayerWriterService.markSynced', () => {
  const syncedRows = (queries: ReturnType<typeof createWriter>['queries']): readonly SyncedRow[] => queries.markSynced.mock.calls[0]?.[0].rows ?? [];

  it('writes nothing for players that no longer exist', async () => {
    const { prisma, queries, writer } = createWriter();

    prisma.player.findMany.mockResolvedValue([]);

    await writer.markSynced([{ accountId: 1, lastBattleAt: NOW, now: NOW }]);

    expect(queries.markSynced).not.toHaveBeenCalled();
  });

  it('polls an active subscriber sooner than an active non-subscriber in one batched write', async () => {
    const { prisma, announce, queries, writer } = createWriter();

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, trackingTier: 'active' }),
      mock<Player>({ accountId: 2n, trackingTier: 'active' })
    ]);

    announce.subscribers.mockResolvedValue(new Set([1]));

    await writer.markSynced([
      { accountId: 1, lastBattleAt: NOW, now: NOW },
      { accountId: 2, lastBattleAt: NOW, now: NOW }
    ]);

    const [subscriber, regular] = syncedRows(queries);

    expect(queries.markSynced).toHaveBeenCalledTimes(1);
    expect(subscriber?.nextPollAt.getTime()).toBeLessThan(regular?.nextPollAt.getTime() ?? 0);
    expect(subscriber?.lastPolledAt).toEqual(NOW);
  });

  it('does not treat a subscriber outside the active tier as one', async () => {
    const subscribed = createWriter();
    const plain = createWriter();

    for (const { prisma } of [subscribed, plain]) {
      prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, trackingTier: 'population' })]);
    }

    subscribed.announce.subscribers.mockResolvedValue(new Set([1]));
    plain.announce.subscribers.mockResolvedValue(new Set());

    await subscribed.writer.markSynced([{ accountId: 1, lastBattleAt: null, now: NOW }]);
    await plain.writer.markSynced([{ accountId: 1, lastBattleAt: null, now: NOW }]);

    expect(syncedRows(subscribed.queries)).toEqual(syncedRows(plain.queries));
  });
});

describe('PlayerWriterService.markMissing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parks missing accounts as dormant until the dormant interval passes', async () => {
    const { prisma, writer } = createWriter();

    await writer.markMissing([1, 2]);

    expect(prisma.player.updateMany.mock.calls[0]?.[0].data).toEqual({
      trackingTier: 'dormant',
      nextPollAt: addDays(NOW, TRACKING.intervals.dormantDays)
    });
  });
});
