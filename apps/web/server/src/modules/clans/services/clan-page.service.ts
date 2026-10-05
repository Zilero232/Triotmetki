import type { ClanMember, ClanMemberEvent, ClanPage, Paginated } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { ClanEventPageInput, ClanEventsInput } from '../clans.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { clampPercent, paginate, ratingValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { CLAN_PAGE } from '../config/clan-page.constants';
import { avgBattlesPerDay } from '../lib/avg-battles-per-day/avg-battles-per-day';
import { toClanEvent, toClanMember, toClanSummary } from '../mappers/clans.mappers';
import { CLAN_MEMBER_INCLUDE } from '../selects/clans.selects';

@Injectable()
export class ClanPageService {
  constructor(private readonly prisma: PrismaService) {}

  async page(clanId: bigint): Promise<ClanPage> {
    const clan = await this.prisma.clan.findUnique({ where: { clanId } });

    if (!clan) {
      throw new AppNotFoundException('CLAN_NOT_FOUND', `No clan with id ${clanId}`);
    }

    const [snapshot, activity, provincesCount, members, events] = await Promise.all([
      this.prisma.clanSnapshot.findFirst({ where: { clanId }, orderBy: { capturedAt: 'desc' } }),
      this.prisma.clanSnapshot.findMany({
        where: { clanId, capturedAt: { gte: subDays(new Date(), CLAN_PAGE.battlesPerDayDays) } },
        select: { battlesDelta: true, membersCount: true }
      }),
      this.prisma.globalMapProvince.count({ where: { ownerClanId: clanId } }),
      this.members(clanId),
      this.events({ clanId, limit: CLAN_PAGE.recentEvents, offset: 0 })
    ]);

    return {
      clan: toClanSummary(clan),
      stats: {
        avgWinRate: clampPercent(snapshot?.avgWinRate),
        avgWn8: ratingValue({ kind: 'wn8', value: snapshot?.avgWn8 }),
        avgBattlesPerDay: avgBattlesPerDay(activity),
        activeMembers7d: snapshot?.activeMembers7d ?? null,
        eloRating10: snapshot?.eloRating10 ?? null,
        strongholdLevel: clan.strongholdLevel,
        provincesCount
      },
      members,
      recentEvents: events.items,
      updatedAt: (clan.lastPolledAt ?? clan.updatedAt).toISOString()
    };
  }

  async members(clanId: bigint): Promise<ClanMember[]> {
    const rows = await this.prisma.clanMember.findMany({
      where: { clanId, player: { isHidden: false } },
      include: CLAN_MEMBER_INCLUDE
    });

    const now = new Date();

    return rows.map((row) => toClanMember({ row, now }));
  }

  events({ clanId, limit, offset }: ClanEventsInput): Promise<Paginated<ClanMemberEvent>> {
    return paginate({
      limit,
      offset,
      fetch: (window) => this.eventPage({ clanId, window }),
      count: () => this.prisma.clanMemberEvent.count({ where: { clanId } })
    });
  }

  private async eventPage({ clanId, window }: ClanEventPageInput): Promise<ClanMemberEvent[]> {
    const rows = await this.prisma.clanMemberEvent.findMany({ where: { clanId }, orderBy: { occurredAt: 'desc' }, ...window });

    const players = await this.prisma.player.findMany({
      where: { accountId: { in: rows.map((row) => row.accountId) } },
      select: { accountId: true, nickname: true, isHidden: true }
    });

    const nicknameOf = new Map(players.map((player) => [player.accountId, player.nickname]));
    const hidden = new Set(players.filter((player) => player.isHidden).map((player) => player.accountId));

    return rows.filter((row) => !hidden.has(row.accountId)).map((row) => toClanEvent({ row, nickname: nicknameOf.get(row.accountId) ?? null }));
  }
}
