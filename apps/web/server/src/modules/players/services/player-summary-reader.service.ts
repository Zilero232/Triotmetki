import type { PlayerProfile, PlayerSummary, RecentPeriods, StatsBlock } from '@otmetki/schemas';

import { Injectable, Logger } from '@nestjs/common';

import { AppNotFoundException } from '../../../common/exceptions';
import { CLAN_ROLE_FROM_DB, errorMessage, RATING_PERIOD_FROM_DB, RATING_PERIOD_TO_DB, toIso, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { clanEmblem } from '../../clans';
import { PLAYER_STATS } from '../config/player-stats.constants';
import { statsBlockFromRating, statsBlockFromTotals, totalsFromLestaBlock } from '../lib/stats-block/stats-block';
import { toSnapshotStats } from '../mappers/snapshot-stats.mappers';
import { PlayerResolverService } from './player-resolver.service';

@Injectable()
export class PlayerSummaryReaderService {
  private readonly logger = new Logger(PlayerSummaryReaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PlayerResolverService
  ) {}

  async profile(accountId: bigint): Promise<PlayerProfile> {
    const [summary, recent] = await Promise.all([this.summary(accountId), this.recent(accountId)]);

    return { summary, recent };
  }

  async summary(accountId: bigint): Promise<PlayerSummary> {
    const [player, snapshot, overall, marks, mastery, tanksOwned] = await Promise.all([
      this.prisma.player.findUnique({
        where: { accountId },
        include: { clanMembership: { include: { clan: true } } }
      }),
      this.prisma.accountSnapshot.findFirst({ where: { accountId, mode: PLAYER_STATS.snapshotMode }, orderBy: { capturedAt: 'desc' } }),
      this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId, period: 'overall' } } }),
      this.prisma.playerTank.groupBy({ by: ['marksOnGun'], where: { accountId, marksOnGun: { gt: 0 } }, _count: { _all: true } }),
      this.prisma.playerTank.count({ where: { accountId, markOfMastery: 4 } }),
      this.prisma.playerTank.count({ where: { accountId } })
    ]);

    if (!player) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player with id ${accountId}`);
    }

    const marksOf = (count: number) => marks.find((group) => group.marksOnGun === count)?._count._all ?? 0;
    const membership = player.clanMembership;

    return {
      accountId: toNumber(player.accountId),
      nickname: player.nickname,
      clan: membership
        ? {
            clanId: toNumber(membership.clan.clanId),
            tag: membership.clan.tag,
            name: membership.clan.name,
            color: membership.clan.color,
            role: CLAN_ROLE_FROM_DB[membership.role],
            emblem: clanEmblem(membership.clan.emblems),
            joinedAt: toIso(membership.joinedAt)
          }
        : null,
      createdAt: toIso(player.createdAt),
      lastBattleAt: toIso(player.lastBattleAt),
      updatedAt: (snapshot?.capturedAt ?? player.updatedAt).toISOString(),
      isTracked: player.trackingTier === 'active',
      overall: snapshot ? toSnapshotStats({ snapshot, rating: overall }) : await this.fromLesta(accountId),
      marks: { moe3: marksOf(3), moe2: marksOf(2), moe1: marksOf(1), mastery, tanksOwned }
    };
  }

  async recent(accountId: bigint): Promise<RecentPeriods> {
    const ratings = await this.prisma.accountRating.findMany({
      where: { accountId, period: { in: PLAYER_STATS.recentPeriods.map((period) => RATING_PERIOD_TO_DB[period]) } }
    });

    return PLAYER_STATS.recentPeriods.map((period) => {
      const rating = ratings.find((row) => RATING_PERIOD_FROM_DB[row.period] === period);

      return {
        period,
        from: toIso(rating?.fromCapturedAt),
        to: toIso(rating?.toCapturedAt),
        stats: rating ? statsBlockFromRating(rating) : null
      };
    });
  }

  private async fromLesta(accountId: bigint): Promise<StatsBlock> {
    const info = await this.resolver.fetchInfo(accountId).catch((error: unknown) => {
      this.logger.warn(`live stats of ${accountId} unavailable: ${errorMessage(error)}`);

      return null;
    });

    const block = info?.statistics.random ?? info?.statistics.all;

    return statsBlockFromTotals(totalsFromLestaBlock(block));
  }
}
