import { Injectable } from '@nestjs/common';

import type { ClanCard, MarksCard, PlayerCard, SessionCard, TankCard, TopLine } from '../bot-commands.types';

import { PrismaService } from '../../../core';
import { PlayerResolverService, PlayerSummaryReaderService } from '../../players';
import { ThresholdsReaderService, VehicleCatalogService } from '../../reference';
import { BOT_REPLY_LIMITS } from '../config';
import { findTanks } from '../lib';

@Injectable()
export class BotStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PlayerResolverService,
    private readonly summaries: PlayerSummaryReaderService,
    private readonly catalog: VehicleCatalogService,
    private readonly thresholds: ThresholdsReaderService
  ) {}

  resolve(nickname: string): Promise<bigint> {
    return this.resolver.resolve(nickname);
  }

  async player(accountId: bigint): Promise<PlayerCard> {
    const summary = await this.summaries.summary(accountId);

    return {
      accountId,
      nickname: summary.nickname,
      battles: summary.overall.battles,
      winRate: summary.overall.winRate,
      avgDamage: summary.overall.avgDamage,
      wn8: summary.overall.wn8.value,
      clanTag: summary.clan?.tag ?? null
    };
  }

  async session(accountId: bigint): Promise<SessionCard | null> {
    const session = await this.prisma.playSession.findFirst({ where: { accountId, battles: { gt: 0 } }, orderBy: { startedAt: 'desc' } });

    if (!session) {
      return null;
    }

    return {
      battles: session.battles,
      wins: session.wins,
      avgDamage: session.damageDealt / session.battles,
      wn8: session.wn8,
      startedAt: session.startedAt,
      isOpen: session.status === 'open' && session.reportSentAt === null
    };
  }

  async marks(accountId: bigint): Promise<MarksCard> {
    const [groups, closest] = await Promise.all([
      this.prisma.playerTank.groupBy({ by: ['marksOnGun'], where: { accountId, marksOnGun: { gt: 0 } }, _count: { _all: true } }),
      this.prisma.playerTank.findMany({
        where: { accountId, marksOnGun: { lt: 3 }, moePercent: { not: null } },
        orderBy: { moePercent: 'desc' },
        take: BOT_REPLY_LIMITS.closestMarks,
        select: { tankId: true, marksOnGun: true, moePercent: true }
      })
    ]);

    const countOf = (marks: number) => groups.find((group) => group.marksOnGun === marks)?._count._all ?? 0;

    const lines = await Promise.all(
      closest.map(async (row) => {
        const vehicle = await this.catalog.summary(row.tankId);

        return { tankName: vehicle.shortName || vehicle.name, marks: row.marksOnGun ?? 0, percent: row.moePercent ?? 0 };
      })
    );

    return { moe3: countOf(3), moe2: countOf(2), moe1: countOf(1), closest: lines };
  }

  async clan(accountId: bigint): Promise<ClanCard | null> {
    const member = await this.prisma.clanMember.findUnique({ where: { accountId }, include: { clan: true } });

    if (!member) {
      return null;
    }

    return { tag: member.clan.tag, name: member.clan.name, membersCount: member.clan.membersCount, role: member.role };
  }

  async tank(query: string): Promise<TankCard | null> {
    const entries = [...(await this.catalog.all()).values()];
    const [match] = findTanks({
      entries,
      query,
      limit: BOT_REPLY_LIMITS.tankMatches,
      names: (entry) => [entry.summary.name, entry.summary.shortName, entry.summary.slug]
    });

    if (!match) {
      return null;
    }

    const { summary } = match;
    const moe = await this.thresholds.moe(summary.tankId);

    return {
      tankId: summary.tankId,
      name: summary.name,
      tier: summary.tier,
      type: summary.type,
      slug: summary.slug,
      moe: moe ? { p65: moe.p65, p85: moe.p85, p95: moe.p95 } : null
    };
  }

  async top(): Promise<TopLine[]> {
    const rows = await this.prisma.accountRating.findMany({
      where: {
        period: BOT_REPLY_LIMITS.topPeriod,
        battles: { gte: BOT_REPLY_LIMITS.topMinBattles },
        wn8: { not: null },
        player: { isHidden: false }
      },
      orderBy: { wn8: 'desc' },
      take: BOT_REPLY_LIMITS.topSize,
      select: { wn8: true, battles: true, player: { select: { nickname: true } } }
    });

    return rows.map((row) => ({ nickname: row.player.nickname, wn8: row.wn8 ?? 0, battles: row.battles }));
  }
}
