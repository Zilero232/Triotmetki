import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, AccountSnapshot, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BattleStatsBlock } from '../../../../lib/lesta';
import type { LestaPlayerInfo } from '../../players.types';
import type { PlayerResolverService } from '../player-resolver.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { PlayerSummaryReaderService } from '../player-summary-reader.service';

const UPDATED_AT = new Date('2026-09-20T10:00:00.000Z');
const CAPTURED_AT = new Date('2026-09-25T10:00:00.000Z');

const block = (battles: number): BattleStatsBlock => ({
  battles,
  wins: battles / 2,
  losses: battles / 2,
  draws: 0,
  xp: battles * 500,
  damage_dealt: battles * 1500,
  damage_received: battles * 1000,
  frags: battles,
  spotted: battles,
  capture_points: 0,
  dropped_capture_points: 0,
  hits: battles * 6,
  shots: battles * 8,
  survived_battles: battles / 2
});

const player = () =>
  Object.assign(
    mock<Player>({ accountId: 42n, nickname: 'Tanker', createdAt: null, lastBattleAt: null, updatedAt: UPDATED_AT, trackingTier: 'active' }),
    { clanMembership: null }
  );

const snapshot = mock<AccountSnapshot>({
  capturedAt: CAPTURED_AT,
  battles: 1000,
  wins: 520,
  damageDealt: 1_500_000n,
  frags: 900,
  spotted: 1100,
  xp: 600_000n,
  survived: 300,
  hits: 6000,
  shots: 8000,
  avgDamageBlocked: 400,
  avgDamageAssisted: null
});

const info = (statistics: LestaPlayerInfo['statistics']): LestaPlayerInfo => ({
  account_id: 42,
  nickname: 'Tanker',
  clan_id: null,
  global_rating: 1,
  created_at: 1,
  last_battle_time: 1,
  updated_at: 1,
  statistics
});

type MarksGroup = Awaited<ReturnType<PrismaService['playerTank']['groupBy']>>[number];

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const resolver = mock<PlayerResolverService>();

  prisma.player.findUnique.mockResolvedValue(player());
  prisma.accountSnapshot.findFirst.mockResolvedValue(null);
  prisma.accountRating.findUnique.mockResolvedValue(null);
  vi.mocked(prisma.playerTank.groupBy).mockResolvedValue([]);
  prisma.playerTank.count.mockResolvedValue(0);
  prisma.accountRating.findMany.mockResolvedValue([]);
  resolver.fetchInfo.mockResolvedValue(null);

  return { service: new PlayerSummaryReaderService(prisma, resolver), prisma, resolver };
};

describe('PlayerSummaryReaderService.summary', () => {
  it('answers 404 for an unknown player', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(null);

    await expect(service.summary(1n)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('builds the overall block from the latest snapshot and its rating', async () => {
    const { service, prisma, resolver } = createService();

    prisma.accountSnapshot.findFirst.mockResolvedValue(snapshot);
    prisma.accountRating.findUnique.mockResolvedValue(mock<AccountRating>({ avgTier: 8, wn8: 1700, eff: null, broneIndex: null }));

    const summary = await service.summary(42n);

    expect(summary.overall.battles).toBe(snapshot.battles);
    expect(summary.overall.wn8.value).toBe(1700);
    expect(summary.updatedAt).toBe(CAPTURED_AT.toISOString());
    expect(resolver.fetchInfo).not.toHaveBeenCalled();
  });

  it('falls back to live random stats from Lesta without a snapshot', async () => {
    const { service, resolver } = createService();

    resolver.fetchInfo.mockResolvedValue(info({ all: block(500), random: block(300) }));

    const summary = await service.summary(42n);

    expect(summary.overall.battles).toBe(300);
    expect(summary.updatedAt).toBe(UPDATED_AT.toISOString());
  });

  it('uses all-mode stats when Lesta has no random block', async () => {
    const { service, resolver } = createService();

    resolver.fetchInfo.mockResolvedValue(info({ all: block(500) }));

    expect((await service.summary(42n)).overall.battles).toBe(500);
  });

  it('shows an empty block when Lesta is unavailable', async () => {
    const { service, resolver } = createService();

    resolver.fetchInfo.mockRejectedValue(new Error('timeout'));

    const summary = await service.summary(42n);

    expect(summary.overall.battles).toBe(0);
    expect(summary.overall.winRate).toBeNull();
  });

  it('counts marks per level and a missing level as zero', async () => {
    const { service, prisma } = createService();

    vi.mocked(prisma.playerTank.groupBy).mockResolvedValue([
      mock<MarksGroup>({ marksOnGun: 3, _count: { _all: 2 } }),
      mock<MarksGroup>({ marksOnGun: 1, _count: { _all: 5 } })
    ]);

    const { marks } = await service.summary(42n);

    expect(marks).toMatchObject({ moe3: 2, moe2: 0, moe1: 5 });
  });

  it('reports a clanless player with a null clan', async () => {
    const { service } = createService();

    const summary = await service.summary(42n);

    expect(summary.clan).toBeNull();
    expect(summary.isTracked).toBe(true);
  });
});

describe('PlayerSummaryReaderService.recent', () => {
  it('returns every recent period and leaves periods without a rating empty', async () => {
    const { service, prisma } = createService();

    prisma.accountRating.findMany.mockResolvedValue([
      mock<AccountRating>({ period: 'd7', battles: 40, winRate: 55, avgDamage: 1800, avgFrags: 1, fromCapturedAt: null, toCapturedAt: null })
    ]);

    const recent = await service.recent(42n);
    const week = recent.find((entry) => entry.period === '7d');
    const others = recent.filter((entry) => entry.period !== '7d');

    expect(week?.stats?.battles).toBe(40);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((entry) => entry.stats === null && entry.from === null)).toBe(true);
  });
});
