import { LEAGUE_TIERS } from '@otmetki/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LeagueMembership, Player, PlaySession, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { FollowService } from '../follow.service';
import type { SnapshotEventsService } from '../snapshot-events.service';

import { LEAGUE, LEAGUE_DIVISION } from '../../config';
import { LeagueStatsService } from '../league-stats.service';
import { LeagueService } from '../league.service';

const week = '2026-09-14';
const startedAt = new Date(`${week}T12:00:00Z`);

const session = ({ accountId, battles, damageDealt, wn8 }: Pick<PlaySession, 'accountId' | 'battles' | 'damageDealt' | 'wn8'>): PlaySession => ({
  id: `s-${accountId}-${damageDealt}`,
  accountId,
  source: 'api',
  kind: 'day',
  status: 'closed',
  day: startedAt,
  startedAt,
  endedAt: startedAt,
  lastActivityAt: startedAt,
  battles,
  wins: 0,
  losses: 0,
  draws: 0,
  damageDealt,
  damageAssisted: 0,
  damageBlocked: 0,
  frags: 0,
  spotted: 0,
  xp: 0,
  survived: 0,
  credits: null,
  wn8,
  broneIndex: null,
  tankDeltas: null,
  startCapturedAt: null,
  endCapturedAt: null,
  reportSentAt: null
});

const player = (accountId: bigint, nickname: string): Player => ({
  accountId,
  nickname,
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
  updatedAt: startedAt
});

const battles = LEAGUE.minBattles;

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const follows = mock<FollowService>();
  const events = mock<SnapshotEventsService>();

  follows.circle.mockResolvedValue({ accountIds: [1n, 2n, 3n], own: new Set([1n]) });
  events.markCounts.mockResolvedValue(new Map());
  prisma.player.findMany.mockResolvedValue([player(1n, 'Me'), player(2n, 'Friend')]);
  prisma.leagueMembership.findMany.mockResolvedValue([]);

  prisma.playSession.findMany.mockResolvedValue([
    session({ accountId: 1n, battles, damageDealt: battles * 1_000, wn8: 1_000 }),
    session({ accountId: 1n, battles, damageDealt: battles * 3_000, wn8: 3_000 }),
    session({ accountId: 2n, battles, damageDealt: battles * 2_500, wn8: null }),
    session({ accountId: 9n, battles, damageDealt: battles * 9_000, wn8: 9_000 })
  ]);

  return { service: new LeagueService(prisma, follows, new LeagueStatsService(prisma, events)), prisma, follows, events };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('LeagueService.league', () => {
  it('ranks the circle by average damage over all their sessions of the week', async () => {
    const { service } = createService();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'damage', week });

    expect(entries.map((entry) => [entry.rank, entry.accountId, entry.battles, entry.value])).toEqual([
      [1, 2, battles, 2_500],
      [2, 1, battles * 2, 2_000],
      [3, 3, 0, null]
    ]);
  });

  it('marks only the caller’s own accounts as theirs', async () => {
    const { service } = createService();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week });

    expect(entries.filter((entry) => entry.isMe).map((entry) => entry.accountId)).toEqual([1]);
  });

  it('weights WN8 by battles and skips sessions without it', async () => {
    const { service } = createService();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'wn8', week });

    expect(entries.find((entry) => entry.accountId === 1)?.value).toBe(2_000);
    expect(entries.find((entry) => entry.accountId === 2)?.value).toBeNull();
  });

  it('ignores sessions of accounts outside the circle', async () => {
    const { service } = createService();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week });

    expect(entries.map((entry) => entry.accountId).toSorted()).toEqual([1, 2, 3]);
  });

  it('counts marks only for the marks metric', async () => {
    const { service, events } = createService();

    events.markCounts.mockResolvedValue(new Map([[3n, 2]]));

    await service.league({ userId: 'u1', scope: 'friends', metric: 'damage', week });

    expect(events.markCounts).not.toHaveBeenCalled();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'marks', week });

    expect(entries[0]).toEqual(expect.objectContaining({ accountId: 3, value: 2 }));
  });

  it('weights WN8 by the battles of each session when they differ', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findMany.mockResolvedValue([
      session({ accountId: 1n, battles, damageDealt: 0, wn8: 1_000 }),
      session({ accountId: 1n, battles: battles * 3, damageDealt: 1, wn8: 3_000 })
    ]);

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'wn8', week });

    expect(entries.find((entry) => entry.accountId === 1)?.value).toBe((1_000 + 3_000 * 3) / 4);
  });

  it('gives no value to an account one battle short of the minimum', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findMany.mockResolvedValue([
      session({ accountId: 1n, battles: LEAGUE.minBattles - 1, damageDealt: 99_999, wn8: 5_000 }),
      session({ accountId: 2n, battles: LEAGUE.minBattles, damageDealt: LEAGUE.minBattles, wn8: 500 })
    ]);

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'damage', week });

    expect(entries.find((entry) => entry.accountId === 1)).toMatchObject({ battles: LEAGUE.minBattles - 1, value: null });
    expect(entries.find((entry) => entry.accountId === 2)?.value).toBe(1);
  });

  it('shows no nickname for an account without a player row', async () => {
    const { service } = createService();

    const { entries } = await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week });

    expect(entries.find((entry) => entry.accountId === 3)?.nickname).toBeNull();
    expect(entries.find((entry) => entry.accountId === 2)?.nickname).toBe('Friend');
  });

  it('starts the week on the Monday of the requested date', async () => {
    const { service } = createService();

    expect((await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week: '2026-09-17' })).weekStart).toBe(week);
  });

  it.each([
    ['a Sunday', '2026-09-20', week],
    ['a Monday', '2026-09-21', '2026-09-21']
  ])('puts %s into the week that starts on the right Monday', async (_, requested, expected) => {
    const { service } = createService();

    expect((await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week: requested })).weekStart).toBe(expected);
  });

  it('uses the current week when none is requested', async () => {
    const { service } = createService();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));

    expect((await service.league({ userId: 'u1', scope: 'friends', metric: 'battles', week: undefined })).weekStart).toBe(week);
  });
});

const [tier] = LEAGUE_TIERS;
const weekStart = new Date(`${week}T00:00:00Z`);

const membership = (accountId: bigint, overrides: Partial<LeagueMembership> = {}): LeagueMembership => ({
  accountId,
  weekStart,
  tier,
  groupNo: 2,
  rank: null,
  value: null,
  battles: 0,
  zone: null,
  closedAt: null,
  createdAt: weekStart,
  ...overrides
});

const link = (accountId: bigint): UserLestaAccount => ({
  id: `l-${accountId}`,
  userId: 'u1',
  accountId,
  accessToken: null,
  tokenExpiresAt: null,
  tokenStaleAt: null,
  garageSyncedAt: null,
  isPrimary: true,
  linkedAt: weekStart,
  updatedAt: weekStart
});

const divisionService = (group: LeagueMembership[]) => {
  const created = createService();

  created.prisma.userLestaAccount.findMany.mockResolvedValue([link(1n)]);
  created.prisma.leagueMembership.findMany.mockResolvedValueOnce(group.filter((row) => row.accountId === 1n)).mockResolvedValueOnce(group);

  return created;
};

describe('LeagueService.league in the division scope', () => {
  const size = LEAGUE_DIVISION.minRanked;
  const group = Array.from({ length: size }, (_, index) => membership(BigInt(index + 1)));

  it('returns no division before the account is placed', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n)]);

    expect(await service.league({ userId: 'u1', scope: 'division', metric: 'damage', week })).toMatchObject({
      scope: 'division',
      division: null,
      entries: []
    });
  });

  it('ranks the whole group live by the division metric and projects the zones', async () => {
    const { service, prisma } = divisionService(group);

    prisma.playSession.findMany.mockResolvedValue(
      group.map((row, index) => session({ accountId: row.accountId, battles: LEAGUE_DIVISION.minBattles, damageDealt: 0, wn8: 1_000 + index }))
    );

    const league = await service.league({ userId: 'u1', scope: 'division', metric: 'damage', week });

    expect(league.metric).toBe(LEAGUE_DIVISION.metric);
    expect(league.division).toMatchObject({ tier, group: 2, size, isClosed: false, promotionSlots: 1, relegationSlots: 0, relegatesTo: null });
    expect(league.entries[0]).toMatchObject({ accountId: size, rank: 1, zone: 'promotion', tier });
    expect(league.entries.find((entry) => entry.isMe)).toMatchObject({ accountId: 1, rank: size });
  });

  it('reads a closed week from the stored results without recomputing', async () => {
    const closed = group.map((row, index) =>
      membership(row.accountId, { rank: index + 1, value: 100 - index, battles: 20, zone: index === 0 ? 'promotion' : 'stay', closedAt: weekStart })
    );

    const { service, prisma } = divisionService(closed);

    const league = await service.league({ userId: 'u1', scope: 'division', metric: 'damage', week });

    expect(prisma.playSession.findMany).not.toHaveBeenCalled();
    expect(league.division?.isClosed).toBe(true);
    expect(league.entries.map((entry) => entry.zone)).toEqual(closed.map((row) => row.zone));
  });
});
