import { Inject, Injectable } from '@nestjs/common';

import type { WrappedQueries } from '../queries/wrapped.types';
import type { WrappedInput, WrappedView } from '../social.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { ratio, winRateShare } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { FEED } from '../config/feed.constants';
import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { WRAPPED } from '../config/wrapped.constants';
import { isMarkGain, isMasteryGain } from '../lib/feed/feed';
import { SnapshotEventsReaderService } from './snapshot-events-reader.service';

@Injectable()
export class WrappedReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SnapshotEventsReaderService,
    @Inject(SOCIAL_QUERY_TOKENS.wrapped) private readonly queries: WrappedQueries
  ) {}

  async wrapped({ accountId, year = new Date().getUTCFullYear() }: WrappedInput): Promise<WrappedView> {
    const id = BigInt(accountId);
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const player = await this.prisma.player.findUnique({ where: { accountId: id }, select: { nickname: true, isHidden: true } });

    if (!player || player.isHidden) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player ${accountId}`);
    }

    const range = { db: this.prisma.$kysely, accountId, start, end };
    const window = { accountId: id, mode: 'all' as const, capturedAt: { gte: start, lt: end } };
    const [first, last, tanks, snapshotEvents, badges, sessions, busiestMonth, battle] = await Promise.all([
      this.prisma.accountSnapshot.findFirst({ where: window, orderBy: { capturedAt: 'asc' } }),
      this.prisma.accountSnapshot.findFirst({ where: window, orderBy: { capturedAt: 'desc' } }),
      this.queries.wrappedTopTanks({ ...range, limit: WRAPPED.topTanks }),
      this.events.tankEvents({ accountIds: [id], since: start, until: end }),
      this.prisma.accountBadge.findMany({ where: { accountId: id, awardedAt: { gte: start, lt: end } }, select: { badgeCode: true } }),
      this.prisma.playSession.count({ where: { accountId: id, startedAt: { gte: start, lt: end } } }),
      this.queries.wrappedBusiestMonth(range),
      this.queries.wrappedBestBattle(range)
    ]);

    const replay = battle
      ? await this.prisma.replay.findFirst({
          where: {
            visibility: 'public',
            status: 'parsed',
            OR: [{ battleId: battle.id }, { accountId: id, arenaUniqueId: BigInt(battle.arenaUniqueId) }]
          },
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
      winRate: winRateShare({ wins, battles }),
      damageDealt: damage,
      avgDamage: ratio({ value: damage, by: battles }),
      frags: first && last ? last.frags - first.frags : 0,
      topTanks: tanks.map((row) => ({ tankId: row.tankId, battles: row.battles, damageDealt: row.damage })),
      marksGained: snapshotEvents.filter((row) => isMarkGain(row)).length,
      masteriesGained: snapshotEvents.filter((row) => isMasteryGain({ row, aceMastery: FEED.aceMastery })).length,
      badges: badges.map((badge) => badge.badgeCode),
      sessions,
      busiestMonth: busiestMonth?.month ?? null,
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
