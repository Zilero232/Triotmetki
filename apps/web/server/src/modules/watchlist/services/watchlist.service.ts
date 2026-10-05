import type { Watchlist, WatchlistSettings } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { isPlusDigest, WATCHLIST } from '@otmetki/schemas';
import { subHours } from 'date-fns';

import type { WatchlistAddInput, WatchlistListInput, WatchlistRemoveInput, WatchlistSettingsInput } from '../watchlist.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { percentOf, ratio } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { CollectorProducerService } from '../../collector';
import { NOTIFICATION_DEFAULTS } from '../../notifications';
import { clearFollowFlag, setFollowFlag } from '../../social';
import { WATCHLIST_DIGEST_RUN } from '../config';
import { WatchlistActivityService } from './watchlist-activity.service';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly collector: CollectorProducerService,
    private readonly activity: WatchlistActivityService
  ) {}

  async list({ userId, query }: WatchlistListInput): Promise<Watchlist> {
    const since = subHours(new Date(), WATCHLIST.periodHours[query.period]);

    const [follows, settings, limit] = await Promise.all([
      this.prisma.follow.findMany({ where: { userId, kind: 'player', isFollowing: true }, orderBy: { createdAt: 'asc' } }),
      this.settings(userId),
      this.entitlements.limit({ userId, key: 'watchedPlayers' })
    ]);

    const accountIds = follows.map((follow) => follow.targetId);

    const [players, ratings, activity] = await Promise.all([
      this.prisma.player.findMany({
        where: { accountId: { in: accountIds } },
        select: { accountId: true, nickname: true, clanId: true, lastBattleAt: true, isHidden: true }
      }),
      this.prisma.accountRating.findMany({ where: { accountId: { in: accountIds }, period: 'd7' }, select: { accountId: true, wn8: true } }),
      this.activity.activity({ accountIds, since })
    ]);

    const clanIds = players.flatMap((player) => (player.clanId === null ? [] : [player.clanId]));
    const clans =
      clanIds.length > 0 ? await this.prisma.clan.findMany({ where: { clanId: { in: clanIds } }, select: { clanId: true, tag: true } }) : [];

    const playerOf = new Map(players.map((player) => [player.accountId, player]));
    const hidden = new Set(players.filter((player) => player.isHidden).map((player) => player.accountId));
    const tagOf = new Map(clans.map((clan) => [clan.clanId, clan.tag]));
    const wn8Of = new Map(ratings.map((rating) => [rating.accountId, rating.wn8]));

    return {
      period: query.period,
      digest: settings.digest,
      lastDigestAt: settings.lastDigestAt,
      limit,
      players: follows
        .filter((follow) => !hidden.has(follow.targetId))
        .map((follow) => {
          const player = playerOf.get(follow.targetId);
          const stats = activity.get(follow.targetId);
          const battles = stats?.battles ?? 0;
          const lastBattleAt = player?.lastBattleAt ?? stats?.lastBattleAt ?? null;

          return {
            followId: follow.id,
            accountId: Number(follow.targetId),
            nickname: player?.nickname ?? null,
            clanTag: player?.clanId ? (tagOf.get(player.clanId) ?? null) : null,
            watchedSince: follow.createdAt.toISOString(),
            lastBattleAt: lastBattleAt?.toISOString() ?? null,
            battles,
            wins: stats?.wins ?? 0,
            winRate: percentOf({ value: stats?.wins ?? 0, by: battles }),
            avgDamage: ratio({ value: stats?.damage ?? 0, by: battles }),
            marksGained: stats?.marksGained ?? 0,
            wn8: wn8Of.get(follow.targetId) ?? null
          };
        })
    };
  }

  async add({ userId, accountId }: WatchlistAddInput): Promise<Watchlist> {
    const targetId = BigInt(accountId);
    const [existing, count] = await Promise.all([
      this.prisma.follow.findUnique({ where: { userId_kind_targetId: { userId, kind: 'player', targetId } }, select: { isFollowing: true } }),
      this.prisma.follow.count({ where: { userId, kind: 'player', isFollowing: true } })
    ]);

    if (!existing?.isFollowing) {
      await this.entitlements.assertWithinLimit({ userId, key: 'watchedPlayers', count });
      await setFollowFlag({ prisma: this.prisma, flag: 'isFollowing', key: { userId, kind: 'player', targetId } });
      await this.collector.enrol({ accountId, priority: 'high', reason: 'follow' });
    }

    return this.list({ userId, query: { period: WATCHLIST.defaultPeriod } });
  }

  async remove({ userId, accountId }: WatchlistRemoveInput): Promise<void> {
    const removed = await clearFollowFlag({
      prisma: this.prisma,
      flag: 'isFollowing',
      where: { userId, kind: 'player', targetId: BigInt(accountId) }
    });

    if (!removed) {
      throw new AppNotFoundException('NOT_FOUND', `Player ${accountId} is not on the watchlist`);
    }
  }

  async settings(userId: string): Promise<WatchlistSettings> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { userId }, select: { watchlistDigest: true, watchlistDigestAt: true } });

    return { digest: row?.watchlistDigest ?? WATCHLIST.defaultDigest, lastDigestAt: row?.watchlistDigestAt?.toISOString() ?? null };
  }

  async updateSettings({ userId, digest }: WatchlistSettingsInput): Promise<WatchlistSettings> {
    if (isPlusDigest(digest)) {
      await this.entitlements.assertFeature({ userId, feature: WATCHLIST_DIGEST_RUN.hourlyFeature });
    }

    const row = await this.prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        channels: [...NOTIFICATION_DEFAULTS.channels],
        events: [...NOTIFICATION_DEFAULTS.events],
        sessionReport: NOTIFICATION_DEFAULTS.sessionReport,
        weeklyDigest: NOTIFICATION_DEFAULTS.weeklyDigest,
        watchlistDigest: digest
      },
      update: { watchlistDigest: digest },
      select: { watchlistDigest: true, watchlistDigestAt: true }
    });

    return { digest: row.watchlistDigest, lastDigestAt: row.watchlistDigestAt?.toISOString() ?? null };
  }
}
