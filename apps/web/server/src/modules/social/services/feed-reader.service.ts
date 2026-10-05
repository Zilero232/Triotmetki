import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { FeedInput, FeedItem } from '../social.types';

import { PrismaService } from '../../../core';
import { FEED } from '../config/feed.constants';
import { buildFeed } from '../lib/feed/feed';
import { toFeedBadge } from '../mappers/feed-badge.mappers';
import { FollowReaderService } from './follow-reader.service';
import { SnapshotEventsReaderService } from './snapshot-events-reader.service';

@Injectable()
export class FeedReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly follows: FollowReaderService,
    private readonly events: SnapshotEventsReaderService
  ) {}

  async feed({ userId, days = FEED.days }: FeedInput): Promise<{ items: FeedItem[] }> {
    const { accountIds } = await this.follows.circle(userId);
    const until = new Date();
    const since = subDays(until, days);
    const [snapshots, records, badges, players] = await Promise.all([
      this.events.tankEvents({ accountIds, since, until }),
      this.events.recordEvents({ accountIds, since, until }),
      this.prisma.accountBadge.findMany({
        where: { accountId: { in: accountIds }, awardedAt: { gte: since } },
        select: { accountId: true, badgeCode: true, awardedAt: true }
      }),
      this.prisma.player.findMany({ where: { accountId: { in: accountIds } }, select: { accountId: true, nickname: true } })
    ]);

    return {
      items: buildFeed({
        snapshots,
        records,
        badges,
        nicknames: new Map(players.map((player) => [player.accountId, player.nickname])),
        aceMastery: FEED.aceMastery,
        limit: FEED.limit,
        badgeOf: toFeedBadge
      })
    };
  }
}
