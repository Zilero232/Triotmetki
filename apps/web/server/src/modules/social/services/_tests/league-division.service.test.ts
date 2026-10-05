import { LEAGUE_TIERS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LeagueMembership, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { LeagueStatsService } from '../league-stats.service';

import { LEAGUE_DIVISION } from '../../config';
import { LeagueDivisionService } from '../league-division.service';

const now = new Date('2026-09-21T09:00:00Z');
const thisWeek = new Date('2026-09-21T00:00:00Z');
const lastWeek = new Date('2026-09-14T00:00:00Z');
const [lowest, second] = LEAGUE_TIERS;

const membership = (accountId: bigint, overrides: Partial<LeagueMembership> = {}): LeagueMembership => ({
  accountId,
  weekStart: lastWeek,
  tier: lowest,
  groupNo: 1,
  rank: null,
  value: null,
  battles: 0,
  zone: null,
  closedAt: null,
  createdAt: lastWeek,
  ...overrides
});

const link = (accountId: bigint): UserLestaAccount => ({
  id: `l-${accountId}`,
  userId: `u-${accountId}`,
  accountId,
  accessToken: null,
  tokenExpiresAt: null,
  tokenStaleAt: null,
  garageSyncedAt: null,
  isPrimary: true,
  linkedAt: lastWeek,
  updatedAt: lastWeek
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const stats = mock<LeagueStatsService>();

  prisma.leagueMembership.findMany.mockResolvedValue([]);
  prisma.leagueMembership.createMany.mockResolvedValue({ count: 0 });
  prisma.userLestaAccount.findMany.mockResolvedValue([]);
  stats.weekStats.mockResolvedValue(new Map());

  return { service: new LeagueDivisionService(prisma, stats), prisma, stats };
};

describe('LeagueDivisionService.openWeek and hidden players', () => {
  it('places only linked accounts whose player did not ask for deletion', async () => {
    const { service, prisma } = createService();

    await service.openWeek(new Date('2026-09-14T12:00:00Z'));

    expect(prisma.userLestaAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { player: { isHidden: false } } }));
  });
});

describe('LeagueDivisionService.openWeek', () => {
  it('places nobody twice, so a second run changes nothing', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n)]);
    prisma.leagueMembership.findMany.mockResolvedValueOnce([membership(1n, { weekStart: thisWeek })]);

    expect(await service.openWeek(now)).toBe(0);
    expect(prisma.leagueMembership.createMany).not.toHaveBeenCalled();
  });

  it('moves last week’s promoted players up a tier and starts newcomers at the bottom', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n), link(2n)]);
    prisma.leagueMembership.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([membership(1n, { zone: 'promotion', value: 1_500 })]);

    await service.openWeek(now);

    const [call] = prisma.leagueMembership.createMany.mock.calls[0] ?? [];

    expect(call?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: 1n, tier: second, weekStart: thisWeek, groupNo: 1 }),
        expect.objectContaining({ accountId: 2n, tier: lowest, weekStart: thisWeek, groupNo: 1 })
      ])
    );

    expect(call?.skipDuplicates).toBe(true);
  });

  it('adds a late joiner to an existing group of the tier', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n), link(9n)]);
    prisma.leagueMembership.findMany.mockResolvedValueOnce([membership(1n, { weekStart: thisWeek, groupNo: 4 })]).mockResolvedValueOnce([]);

    await service.openWeek(now);

    expect(prisma.leagueMembership.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ accountId: 9n, groupNo: 4 })]);
  });
});

describe('LeagueDivisionService.rollover', () => {
  it('closes every past week that is still open and stores the zones', async () => {
    const { service, prisma, stats } = createService();
    const group = Array.from({ length: LEAGUE_DIVISION.minRanked }, (_, index) => membership(BigInt(index + 1), { tier: second }));

    prisma.leagueMembership.findMany.mockResolvedValueOnce([membership(1n)]).mockResolvedValueOnce(group);

    stats.weekStats.mockResolvedValue(
      new Map(
        group.map((row, index) => [
          row.accountId,
          { accountId: row.accountId, battles: LEAGUE_DIVISION.minBattles, damage: 0, wn8Weighted: index * 100, wn8Battles: 1, marks: 0 }
        ])
      )
    );

    const result = await service.rollover(now);
    const updates = prisma.leagueMembership.update.mock.calls.map(([args]) => args.data);

    expect(result.closed).toBe(1);
    expect(updates).toHaveLength(group.length);
    expect(updates.every((data) => data.closedAt === now)).toBe(true);
    expect(updates.map((data) => data.zone)).toEqual(expect.arrayContaining(['promotion', 'relegation']));
  });
});
