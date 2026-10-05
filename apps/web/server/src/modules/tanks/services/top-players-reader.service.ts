import type { LeaderboardEntry, TopPlayers } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';

import type { TopPlayersInput } from '../tanks.types';

import { RATING_PERIOD_TO_DB, ratingValue, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';

@Injectable()
export class TopPlayersReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async top({ tankId, query }: TopPlayersInput): Promise<TopPlayers> {
    const orderBy = match(query.metric)
      .with('wn8', () => ({ wn8: { sort: 'desc' as const, nulls: 'last' as const } }))
      .with('avgDamage', () => ({ avgDamage: 'desc' as const }))
      .with('winRate', () => ({ winRate: 'desc' as const }))
      .exhaustive();

    const rows = await this.prisma.accountTankRating.findMany({
      where: { tankId, period: RATING_PERIOD_TO_DB[query.period], battles: { gte: query.minBattles }, player: { isHidden: false } },
      orderBy,
      take: query.limit,
      include: { player: { select: { nickname: true, clanId: true } } }
    });

    const clans = await this.prisma.clan.findMany({
      where: { clanId: { in: rows.flatMap((row) => (row.player.clanId === null ? [] : [row.player.clanId])) } },
      select: { clanId: true, tag: true }
    });

    const tagOf = new Map(clans.map((clan) => [clan.clanId, clan.tag]));

    const entries = rows.map((row, index): LeaderboardEntry => {
      const value = match(query.metric)
        .with('wn8', () => row.wn8 ?? 0)
        .with('avgDamage', () => row.avgDamage)
        .with('winRate', () => row.winRate)
        .exhaustive();

      return {
        rank: index + 1,
        accountId: toNumber(row.accountId),
        clanId: null,
        name: row.player.nickname,
        clanTag: row.player.clanId === null ? null : (tagOf.get(row.player.clanId) ?? null),
        color: null,
        value,
        tier: query.metric === 'avgDamage' ? null : ratingValue({ kind: query.metric, value }).tier,
        battles: row.battles,
        delta: null
      };
    });

    return { tankId, period: query.period, metric: query.metric, entries };
  }
}
