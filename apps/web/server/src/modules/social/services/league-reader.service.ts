import { Injectable } from '@nestjs/common';

import type { LeagueInput, LeagueScopeInput, LeagueView } from '../social.types';

import { toIsoDate, weekWindow } from '../../../common/lib';
import { PrismaService, UserLestaAccountsService } from '../../../core';
import { LEAGUE, LEAGUE_DIVISION } from '../config/leagues.constants';
import { divisionStandings, tierMoves } from '../lib/league-division/league-division';
import { needsMarks, rankLeague } from '../lib/league/league';
import { toLeagueEntry, toStoredStandings } from '../mappers/league-entry.mappers';
import { FollowReaderService } from './follow-reader.service';
import { LeagueStatsReaderService } from './league-stats-reader.service';

@Injectable()
export class LeagueReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly follows: FollowReaderService,
    private readonly stats: LeagueStatsReaderService,
    private readonly accounts: UserLestaAccountsService
  ) {}

  async league({ userId, scope, metric, week }: LeagueInput): Promise<LeagueView> {
    const window = weekWindow(week ? new Date(`${week}T00:00:00Z`) : new Date());

    return scope === 'friends' ? this.friends({ userId, metric, window }) : this.division({ userId, metric, window });
  }

  private async friends({ userId, metric, window }: LeagueScopeInput): Promise<LeagueView> {
    const { accountIds, own } = await this.follows.circle(userId);
    const [stats, players, memberships] = await Promise.all([
      this.stats.weekStats({ accountIds, start: window.start, end: window.end, withMarks: needsMarks(metric) }),
      this.prisma.player.findMany({ where: { accountId: { in: accountIds } }, select: { accountId: true, nickname: true } }),
      this.prisma.leagueMembership.findMany({
        where: { weekStart: window.weekStart, accountId: { in: accountIds } },
        select: { accountId: true, tier: true }
      })
    ]);

    const nicknames = new Map(players.map((player) => [player.accountId, player.nickname]));
    const tiers = new Map(memberships.map((membership) => [membership.accountId, membership.tier]));

    return {
      scope: 'friends',
      metric,
      weekStart: toIsoDate(window.weekStart) ?? '',
      endsAt: window.end.toISOString(),
      division: null,
      entries: rankLeague({ stats: [...stats.values()], metric, minBattles: LEAGUE.minBattles }).map((entry) =>
        toLeagueEntry({ entry, nicknames, own, tier: tiers.get(entry.accountId) ?? null, zone: null })
      )
    };
  }

  private async division({ userId, window }: LeagueScopeInput): Promise<LeagueView> {
    const base = {
      scope: 'division',
      metric: LEAGUE_DIVISION.metric,
      weekStart: toIsoDate(window.weekStart) ?? '',
      endsAt: window.end.toISOString()
    } as const;

    const linked = await this.accounts.accountIds(userId);
    const own = new Set(linked);
    const memberships = await this.prisma.leagueMembership.findMany({ where: { weekStart: window.weekStart, accountId: { in: [...own] } } });
    const mine = linked.map((accountId) => memberships.find((membership) => membership.accountId === accountId)).find(Boolean);

    if (!mine) {
      return { ...base, division: null, entries: [] };
    }

    const members = await this.prisma.leagueMembership.findMany({ where: { weekStart: window.weekStart, tier: mine.tier, groupNo: mine.groupNo } });
    const players = await this.prisma.player.findMany({
      where: { accountId: { in: members.map((member) => member.accountId) } },
      select: { accountId: true, nickname: true, isHidden: true }
    });

    const hiddenIds = new Set(players.filter((player) => player.isHidden).map((player) => player.accountId));
    const group = members.filter((member) => !hiddenIds.has(member.accountId));
    const accountIds = group.map((member) => member.accountId);
    const isClosed = group.every((member) => member.closedAt !== null);
    const weekStats = isClosed
      ? null
      : await this.stats.weekStats({ accountIds, start: window.start, end: window.end, withMarks: needsMarks(LEAGUE_DIVISION.metric) });

    const standings = weekStats
      ? divisionStandings({
          tier: mine.tier,
          stats: [...weekStats.values()],
          metric: LEAGUE_DIVISION.metric,
          minBattles: LEAGUE_DIVISION.minBattles,
          rules: LEAGUE_DIVISION
        }).entries
      : toStoredStandings(group);

    const nicknames = new Map(players.map((player) => [player.accountId, player.nickname]));

    return {
      ...base,
      division: {
        accountId: Number(mine.accountId),
        tier: mine.tier,
        group: mine.groupNo,
        size: group.length,
        isClosed,
        promotionSlots: standings.filter((entry) => entry.zone === 'promotion').length,
        relegationSlots: standings.filter((entry) => entry.zone === 'relegation' && entry.value !== null).length,
        ...tierMoves(mine.tier)
      },
      entries: standings.map((entry) => toLeagueEntry({ entry, nicknames, own, tier: mine.tier, zone: entry.zone }))
    };
  }
}
