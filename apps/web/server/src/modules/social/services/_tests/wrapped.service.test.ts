import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountSnapshot, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SnapshotEventsService } from '../snapshot-events.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { FEED } from '../../config';
import { WrappedService } from '../wrapped.service';

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
  const prisma = mockDeep<PrismaService>();
  const events = mock<SnapshotEventsService>();

  prisma.player.findUnique.mockResolvedValue(player);
  prisma.accountSnapshot.findFirst.mockResolvedValueOnce(first).mockResolvedValueOnce(last);
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.accountBadge.findMany.mockResolvedValue([]);
  prisma.playSession.count.mockResolvedValue(0);
  prisma.battle.findFirst.mockResolvedValue(null);
  events.tankEvents.mockResolvedValue([]);

  return { service: new WrappedService(prisma, events), prisma, events };
};

describe('WrappedService.wrapped', () => {
  it('links the best battle only to a public parsed replay, so unlisted replay ids stay private', async () => {
    const { service, prisma } = createService();
    const best = { id: 7n, arenaUniqueId: 42n, damageDealt: 5_000, frags: 3, startedAt: at, tankId: 1 };

    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([best]);
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

  it('reads the snapshots of that calendar year only', async () => {
    const { service, prisma } = createService();

    await service.wrapped(input);

    expect(prisma.accountSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 1n, mode: 'all', capturedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }
      })
    );
  });

  it('leaves the rates empty for a year without snapshots', async () => {
    const { service, prisma } = createService();

    prisma.accountSnapshot.findFirst.mockReset();
    prisma.accountSnapshot.findFirst.mockResolvedValue(null);

    expect(await service.wrapped(input)).toEqual(expect.objectContaining({ battles: 0, winRate: null, avgDamage: null, bestBattle: null }));
  });

  it('counts mark and ace mastery gains from the tank events', async () => {
    const { service, events } = createService();
    const base = { account_id: 1n, tank_id: 1, captured_at: at, marks_on_gun: null, prev_marks: null, mark_of_mastery: 0, prev_mastery: null };

    events.tankEvents.mockResolvedValue([
      { ...base, marks_on_gun: 2, prev_marks: 1 },
      { ...base, mark_of_mastery: FEED.aceMastery, prev_mastery: FEED.aceMastery - 1 }
    ]);

    expect(await service.wrapped(input)).toEqual(expect.objectContaining({ marksGained: 1, masteriesGained: 1 }));
  });
});
