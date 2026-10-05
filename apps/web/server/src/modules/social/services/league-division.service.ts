import { Injectable, Logger } from '@nestjs/common';
import { LEAGUE_TIERS } from '@otmetki/schemas';
import { groupBy, sortBy } from 'remeda';

import type { CloseLeagueWeekInput, LeagueRollover } from '../social.types';

import { previousWeek, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { LEAGUE_DIVISION } from '../config';
import { divisionStandings, needsMarks, nextTier, placeMembers } from '../lib';
import { LeagueStatsService } from './league-stats.service';

@Injectable()
export class LeagueDivisionService {
  private readonly logger = new Logger(LeagueDivisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: LeagueStatsService
  ) {}

  async rollover(now: Date): Promise<LeagueRollover> {
    const { weekStart } = weekWindow(now);
    const open = await this.prisma.leagueMembership.findMany({
      where: { closedAt: null, weekStart: { lt: weekStart } },
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'asc' }
    });

    let closed = 0;

    for (const week of open) {
      closed += await this.closeWeek({ weekStart: week.weekStart, now });
    }

    const placed = await this.openWeek(now);

    this.logger.log(`leagues: ${closed} closed, ${placed} placed`);

    return { closed, placed };
  }

  async closeWeek({ weekStart, now }: CloseLeagueWeekInput): Promise<number> {
    const { start, end } = weekWindow(weekStart);
    const members = await this.prisma.leagueMembership.findMany({ where: { weekStart }, select: { accountId: true, tier: true, groupNo: true } });
    const stats = await this.stats.weekStats({
      accountIds: members.map((member) => member.accountId),
      start,
      end,
      withMarks: needsMarks(LEAGUE_DIVISION.metric)
    });

    const groups = Object.values(groupBy(members, (member) => `${member.tier}:${member.groupNo}`));

    for (const group of groups) {
      const [first] = group;

      if (!first) {
        continue;
      }

      const { entries } = divisionStandings({
        tier: first.tier,
        stats: group.flatMap((member) => stats.get(member.accountId) ?? []),
        metric: LEAGUE_DIVISION.metric,
        minBattles: LEAGUE_DIVISION.minBattles,
        rules: LEAGUE_DIVISION
      });

      await this.prisma.$transaction(
        entries.map((entry) =>
          this.prisma.leagueMembership.update({
            where: { accountId_weekStart: { accountId: entry.accountId, weekStart } },
            data: { rank: entry.rank, value: entry.value, battles: entry.battles, zone: entry.zone, closedAt: now }
          })
        )
      );
    }

    return groups.length;
  }

  async openWeek(now: Date): Promise<number> {
    const { weekStart } = weekWindow(now);
    const [links, existing] = await Promise.all([
      this.prisma.userLestaAccount.findMany({ where: { player: { isHidden: false } }, distinct: ['accountId'], select: { accountId: true } }),
      this.prisma.leagueMembership.findMany({ where: { weekStart }, select: { accountId: true, tier: true, groupNo: true } })
    ]);

    const taken = new Set(existing.map((member) => member.accountId));
    const newcomers = links.map((link) => link.accountId).filter((accountId) => !taken.has(accountId));

    if (newcomers.length === 0) {
      return 0;
    }

    const previous = await this.prisma.leagueMembership.findMany({
      where: { weekStart: previousWeek(now).weekStart, accountId: { in: newcomers } },
      select: { accountId: true, tier: true, zone: true, value: true }
    });

    const before = new Map(previous.map((row) => [row.accountId, row]));
    const byTier = groupBy(newcomers, (accountId) =>
      nextTier({ tier: before.get(accountId)?.tier ?? null, zone: before.get(accountId)?.zone ?? null })
    );

    const rows = LEAGUE_TIERS.flatMap((tier) => {
      const accountIds = byTier[tier] ?? [];
      const groups = new Map<number, number>();

      for (const member of existing) {
        if (member.tier === tier) {
          groups.set(member.groupNo, (groups.get(member.groupNo) ?? 0) + 1);
        }
      }

      const ordered = sortBy(accountIds, [(accountId) => before.get(accountId)?.value ?? Number.NEGATIVE_INFINITY, 'desc'], (accountId) =>
        Number(accountId)
      );

      return [...placeMembers({ groups, newcomers: ordered, groupSize: LEAGUE_DIVISION.groupSize })].map(([accountId, groupNo]) => ({
        accountId,
        weekStart,
        tier,
        groupNo
      }));
    });

    const { count } = await this.prisma.leagueMembership.createMany({ data: rows, skipDuplicates: true });

    return count;
  }
}
