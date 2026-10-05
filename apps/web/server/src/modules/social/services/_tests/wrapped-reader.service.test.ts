import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountSnapshot, Player } from '../../../../../generated';
import type { WrappedQueries } from '../../queries/wrapped.types';
import type { SnapshotEventsReaderService } from '../snapshot-events-reader.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { FEED } from '../../config/feed.constants';
import { WrappedReaderService } from '../wrapped-reader.service';

const year = 2025;
const at = new Date(Date.UTC(year, 5, 1));
const input = { accountId: 1, year };

const player: Player = {
  accountId: 1n,
  nickname: 'Tanker',
  clanId: null,
  createdAt: null,
  lastBattleAt: null,
  trackingTier: 'population',
  lastPolledAt: null,
  nextPollAt: null,
  lastViewedAt: null,
  isHidden: false,
  logoutAt: null,
  progressionProcessedUntil: null,
  updatedAt: at
};

const snapshot = ({ battles, wins, damageDealt, frags }: Pick<AccountSnapshot, 'battles' | 'damageDealt' | 'frags' | 'wins'>): AccountSnapshot => ({
  accountId: 1n,
  mode: 'all',
  capturedAt: at,
  battles,
  wins,
  losses: 0,
  draws: 0,
  damageDealt,
  damageReceived: 0n,
  frags,
  spotted: 0,
  xp: 0n,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 0,
  avgDamageAssisted: null,
  avgDamageAssistedRadio: null,
  avgDamageAssistedTrack: null,
  avgDamageAssistedStun: null,
  maxDamage: null,
  maxDamageTankId: null,
  maxXp: null,
  maxXpTankId: null,
  maxFrags: null,
  maxFragsTankId: null,
  globalRating: null
});

const first = snapshot({ battles: 1_000, wins: 500, damageDealt: 1_000_000n, frags: 800 });
const last = snapshot({ battles: 1_400, wins: 720, damageDealt: 1_800_000n, frags: 1_000 });

const createService = () => {
  const prisma = mockPrismaService();
  const events = mock<SnapshotEventsReaderService>();
  const queries = mock<WrappedQueries>();

  prisma.player.findUnique.mockResolvedValue(player);
  prisma.accountSnapshot.findFirst.mockResolvedValueOnce(first).mockResolvedValueOnce(last);
  queries.wrappedTopTanks.mockResolvedValue([]);
  queries.wrappedBusiestMonth.mockResolvedValue(undefined);
  queries.wrappedBestBattle.mockResolvedValue(undefined);
  prisma.accountBadge.findMany.mockResolvedValue([]);
  prisma.playSession.count.mockResolvedValue(0);
  prisma.battle.findFirst.mockResolvedValue(null);
  events.tankEvents.mockResolvedValue([]);

  return { service: new WrappedReaderService(prisma, events, queries), prisma, events, queries };
};

describe('WrappedReaderService.wrapped', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('links the best battle only to a public parsed replay, so unlisted replay ids stay private', async () => {
    const { service, prisma, queries } = createService();

    queries.wrappedBestBattle.mockResolvedValue({ id: 'battle-7', arenaUniqueId: 42, damageDealt: 5_000, frags: 3, startedAt: at, tankId: 1 });
    prisma.replay.findFirst.mockResolvedValue(null);

    await service.wrapped(input);

    expect(prisma.replay.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ visibility: 'public', status: 'parsed' }) })
    );
  });

  it('reports a hidden player as missing', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue({ ...player, isHidden: true });

    await expect(service.wrapped(input)).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });
    expect(prisma.accountSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it('reports an unknown player as missing', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(null);

    await expect(service.wrapped(input)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('computes the year from the first and last snapshot', async () => {
    const { service } = createService();

    const view = await service.wrapped(input);
    const battles = last.battles - first.battles;
    const damage = Number(last.damageDealt - first.damageDealt);

    expect(view).toEqual(
      expect.objectContaining({
        battles,
        wins: last.wins - first.wins,
        winRate: (last.wins - first.wins) / battles,
        damageDealt: damage,
        avgDamage: damage / battles,
        frags: last.frags - first.frags
      })
    );
  });

  it('reads the snapshots of that Moscow calendar year only', async () => {
    const { service, prisma } = createService();

    await service.wrapped(input);

    expect(prisma.accountSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 1n, mode: 'all', capturedAt: { gte: new Date('2024-12-31T21:00:00Z'), lt: new Date('2025-12-31T21:00:00Z') } }
      })
    );
  });

  it('defaults to the current Moscow year', async () => {
    const { service } = createService();

    vi.useFakeTimers({ now: new Date('2025-12-31T22:00:00Z'), toFake: ['Date'] });

    expect(await service.wrapped({ accountId: 1 })).toEqual(expect.objectContaining({ year: 2026 }));
  });

  it('names the busiest month by its Moscow calendar month', async () => {
    const { service, queries } = createService();

    queries.wrappedBusiestMonth.mockResolvedValue({ monthStart: new Date('2025-03-31T21:00:00Z'), battles: 20 });

    expect(await service.wrapped(input)).toEqual(expect.objectContaining({ busiestMonth: 4 }));
  });

  it('leaves the rates empty for a year without snapshots', async () => {
    const { service, prisma } = createService();

    prisma.accountSnapshot.findFirst.mockReset();
    prisma.accountSnapshot.findFirst.mockResolvedValue(null);

    expect(await service.wrapped(input)).toEqual(expect.objectContaining({ battles: 0, winRate: null, avgDamage: null, bestBattle: null }));
  });

  it('counts mark and ace mastery gains from the tank events', async () => {
    const { service, events } = createService();
    const base = { accountId: 1, tankId: 1, capturedAt: at, marksOnGun: null, prevMarks: null, markOfMastery: 0, prevMastery: null };

    events.tankEvents.mockResolvedValue([
      { ...base, marksOnGun: 2, prevMarks: 1 },
      { ...base, markOfMastery: FEED.aceMastery, prevMastery: FEED.aceMastery - 1 }
    ]);

    expect(await service.wrapped(input)).toEqual(expect.objectContaining({ marksGained: 1, masteriesGained: 1 }));
  });
});
