import { Injectable } from '@nestjs/common';
import { isPlusDigest, WATCHLIST } from '@otmetki/schemas';

import type { DigestForInput } from '../watchlist.types';

import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { NotificationService } from '../../notifications';
import { WATCHLIST_DIGEST_RUN } from '../config/queue.constants';
import { digestWindowStart, isDigestDue, summarizeDigest } from '../lib/watchlist-digest/watchlist-digest';
import { WatchlistActivityReaderService } from './watchlist-activity-reader.service';

@Injectable()
export class WatchlistDigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationService,
    private readonly activity: WatchlistActivityReaderService
  ) {}

  async run(now = new Date()): Promise<number> {
    let cursor: string | undefined;
    let sent = 0;

    for (;;) {
      const page = await this.prisma.notificationSettings.findMany({
        where: {
          watchlistDigest: { not: 'off' },
          user: { follows: { some: { kind: 'player', isFollowing: true } } },
          ...(cursor ? { userId: { gt: cursor } } : {})
        },
        select: { userId: true, watchlistDigest: true, watchlistDigestAt: true },
        orderBy: { userId: 'asc' },
        take: WATCHLIST_DIGEST_RUN.batchSize
      });

      for (const settings of page) {
        sent += await this.digestFor({ settings, now });
      }

      cursor = page.at(-1)?.userId;

      if (page.length < WATCHLIST_DIGEST_RUN.batchSize) {
        return sent;
      }
    }
  }

  private async digestFor({ settings, now }: DigestForInput): Promise<number> {
    const { userId, watchlistDigest, watchlistDigestAt: lastDigestAt } = settings;
    const digest = isPlusDigest(watchlistDigest) && !(await this.entitlements.isPlus(userId)) ? WATCHLIST.lapsedPlusDigest : watchlistDigest;

    if (!isDigestDue({ digest, lastDigestAt, now })) {
      return 0;
    }

    const since = digestWindowStart({ digest, lastDigestAt, now });
    const follows = await this.prisma.follow.findMany({ where: { userId, kind: 'player', isFollowing: true }, select: { targetId: true } });
    const accountIds = follows.map((follow) => follow.targetId);

    const [activity, players] = await Promise.all([
      this.activity.activity({ accountIds, since }),
      this.prisma.player.findMany({ where: { accountId: { in: accountIds } }, select: { accountId: true, nickname: true } })
    ]);

    const nicknameOf = new Map(players.map((player) => [player.accountId, player.nickname]));

    const summary = summarizeDigest({
      players: accountIds.map((accountId) => {
        const stats = activity.get(accountId);

        return {
          nickname: nicknameOf.get(accountId) ?? String(accountId),
          battles: stats?.battles ?? 0,
          wins: stats?.wins ?? 0,
          marksGained: stats?.marksGained ?? 0
        };
      }),
      limit: WATCHLIST.digestTopPlayers
    });

    await this.prisma.notificationSettings.update({ where: { userId }, data: { watchlistDigestAt: now } });

    if (!summary) {
      return 0;
    }

    await this.notifications.notify({
      userId,
      notification: { event: 'watchlistDigest', ...summary },
      dedupeKey: `${WATCHLIST_DIGEST_RUN.dedupePrefix}-${now.toISOString().slice(0, 13)}`
    });

    return 1;
  }
}
