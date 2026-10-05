import { Injectable } from '@nestjs/common';

import type { WrappedBestBattleRow, WrappedMonthRow, WrappedTankRow } from '../queries';
import type { WrappedInput, WrappedView } from '../social.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { FEED, WRAPPED } from '../config';
import { isMarkGain, isMasteryGain } from '../lib';
import { wrappedBestBattleSql, wrappedBusiestMonthSql, wrappedTopTanksSql } from '../queries';
import { SnapshotEventsService } from './snapshot-events.service';

@Injectable()
export class WrappedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SnapshotEventsService
  ) {}

  async wrapped({ accountId, year = new Date().getUTCFullYear() }: WrappedInput): Promise<WrappedView> {
    const id = BigInt(accountId);
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const player = await this.prisma.player.findUnique({ where: { accountId: id }, select: { nickname: true, isHidden: true } });

    if (!player || player.isHidden) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player ${accountId}`);
    }

    const range = { accountId: id, start, end };
    const window = { accountId: id, mode: 'all' as const, capturedAt: { gte: start, lt: end } };
    const [first, last, tanks, snapshotEvents, badges, sessions, months, [battle]] = await Promise.all([
      this.prisma.accountSnapshot.findFirst({ where: window, orderBy: { capturedAt: 'asc' } }),
      this.prisma.accountSnapshot.findFirst({ where: window, orderBy: { capturedAt: 'desc' } }),
      this.prisma.$queryRaw<WrappedTankRow[]>(wrappedTopTanksSql({ ...range, limit: WRAPPED.topTanks })),
      this.events.tankEvents({ accountIds: [id], since: start, until: end }),
      this.prisma.accountBadge.findMany({ where: { accountId: id, awardedAt: { gte: start, lt: end } }, select: { badgeCode: true } }),
      this.prisma.playSession.count({ where: { accountId: id, startedAt: { gte: start, lt: end } } }),
      this.prisma.$queryRaw<WrappedMonthRow[]>(wrappedBusiestMonthSql(range)),
      this.prisma.$queryRaw<WrappedBestBattleRow[]>(wrappedBestBattleSql(range))
    ]);

    const replay = battle
      ? await this.prisma.replay.findFirst({
          where: { visibility: 'public', status: 'parsed', OR: [{ battleId: battle.id }, { accountId: id, arenaUniqueId: battle.arenaUniqueId }] },
          select: { id: true }
        })
      : null;

    const battles = first && last ? last.battles - first.battles : 0;
    const wins = first && last ? last.wins - first.wins : 0;
    const damage = first && last ? Number(last.damageDealt - first.damageDealt) : 0;

    return {
      accountId,
      nickname: player.nickname,
      year,
      battles,
      wins,
      winRate: battles > 0 ? wins / battles : null,
      damageDealt: damage,
      avgDamage: battles > 0 ? damage / battles : null,
      frags: first && last ? last.frags - first.frags : 0,
      topTanks: tanks.map((row) => ({ tankId: row.tank_id, battles: row.battles, damageDealt: Number(row.damage) })),
      marksGained: snapshotEvents.filter((row) => isMarkGain(row)).length,
      masteriesGained: snapshotEvents.filter((row) => isMasteryGain({ row, aceMastery: FEED.aceMastery })).length,
      badges: badges.map((badge) => badge.badgeCode),
      sessions,
      busiestMonth: months[0]?.month ?? null,
      bestBattle: battle
        ? {
            tankId: battle.tankId,
            damageDealt: battle.damageDealt,
            frags: battle.frags,
            at: battle.startedAt.toISOString(),
            replayId: replay?.id ?? null
          }
        : null
    };
  }
}
