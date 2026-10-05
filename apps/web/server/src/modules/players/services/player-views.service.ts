import type { PopularPlayers } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { format, subDays } from 'date-fns';
import { Redis } from 'ioredis';
import { chunk, range, sortBy } from 'remeda';

import type { PopularPlayersInput, PopularRow } from '../players.types';

import { errorMessage, ratingValue, toNumber } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { PLAYER_VIEWS } from '../config/player-lookup.constants';

@Injectable()
export class PlayerViewsService {
  private readonly logger = new Logger(PlayerViewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  record(accountId: bigint): void {
    const key = this.dayKey(new Date());

    void this.redis
      .multi()
      .zincrby(key, 1, accountId.toString())
      .expire(key, PLAYER_VIEWS.retentionSeconds)
      .exec()
      .catch((error: unknown) => {
        this.logger.debug(`view of ${accountId} not counted: ${errorMessage(error)}`);
      });
  }

  async popular({ days, limit }: PopularPlayersInput): Promise<PopularPlayers> {
    const ranked = await this.ranked({ days, limit: limit * PLAYER_VIEWS.overfetch });

    const players = await this.prisma.player.findMany({
      where: { accountId: { in: ranked.map((row) => row.accountId) }, isHidden: false },
      select: {
        accountId: true,
        nickname: true,
        clanId: true,
        ratings: { where: { period: 'overall' }, select: { wn8: true } }
      }
    });

    const clans = await this.prisma.clan.findMany({
      where: { clanId: { in: players.flatMap((player) => (player.clanId === null ? [] : [player.clanId])) } },
      select: { clanId: true, tag: true }
    });

    const tagOf = new Map(clans.map((clan) => [clan.clanId, clan.tag]));
    const playerOf = new Map(players.map((player) => [player.accountId, player]));

    const items = ranked.flatMap((row) => {
      const player = playerOf.get(row.accountId);

      return player
        ? [
            {
              accountId: toNumber(player.accountId),
              nickname: player.nickname,
              clanTag: player.clanId === null ? null : (tagOf.get(player.clanId) ?? null),
              views: Math.max(0, Math.round(row.views)),
              wn8: ratingValue({ kind: 'wn8', value: player.ratings[0]?.wn8 })
            }
          ]
        : [];
    });

    return { days, items: items.slice(0, limit) };
  }

  private async ranked({ days, limit }: PopularPlayersInput): Promise<PopularRow[]> {
    const now = new Date();
    const perDay = Math.max(limit, PLAYER_VIEWS.perDayCandidates);
    const pipeline = this.redis.pipeline();

    for (const offset of range(0, days)) {
      pipeline.zrevrange(this.dayKey(subDays(now, offset)), 0, perDay - 1, 'WITHSCORES');
    }

    const results = (await pipeline.exec()) ?? [];
    const views = new Map<string, number>();

    for (const [error, flat] of results) {
      if (error || !Array.isArray(flat)) {
        continue;
      }

      for (const [member, score] of chunk(flat.map(String), 2)) {
        if (member && score && /^\d+$/.test(member)) {
          views.set(member, (views.get(member) ?? 0) + Number(score));
        }
      }
    }

    return sortBy([...views.entries()], [([, count]) => count, 'desc'])
      .slice(0, limit)
      .map(([member, count]) => ({ accountId: BigInt(member), views: count }));
  }

  private dayKey(date: Date): string {
    return `${PLAYER_VIEWS.keyPrefix}${format(date, 'yyyy-MM-dd')}`;
  }
}
