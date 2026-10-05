import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { chunk, unique } from 'remeda';

import type { DeliverPayload } from '../config/notifications-queue.types';
import type {
  BonusCodeInput,
  BroadcastInput,
  FollowersOfInput,
  NotifyAccountInput,
  NotifyInput,
  NotifyManyInput,
  NotifyTankFollowersInput,
  TankDiscountInput
} from '../notifications.types';

import { PrismaService } from '../../../core';
import { NOTIFICATION_DELIVERY } from '../config/delivery.constants';
import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE.deliver) private readonly queue: Queue<DeliverPayload>
  ) {}

  async notify({ userId, notification, dedupeKey }: NotifyInput): Promise<void> {
    await this.notifyMany({ userIds: [userId], notification, dedupeKey });
  }

  async notifyMany({ userIds, notification, dedupeKey }: NotifyManyInput): Promise<number> {
    const recipients = unique([...userIds]);

    for (const part of chunk(recipients, NOTIFICATION_DELIVERY.fanoutChunk)) {
      await this.queue.addBulk(
        part.map((userId) => ({
          name: NOTIFICATIONS_JOB.deliver.event,
          data: { userId, dedupeKey, notification },
          opts: {
            jobId: `${userId}__${dedupeKey}`.replaceAll(':', '_'),
            attempts: NOTIFICATION_DELIVERY.attempts,
            backoff: { type: 'exponential', delay: NOTIFICATION_DELIVERY.backoffMs }
          }
        }))
      );
    }

    return recipients.length;
  }

  async notifyAccount({ accountId, notification, dedupeKey }: NotifyAccountInput): Promise<number> {
    const [owners, followers] = await Promise.all([
      this.prisma.userLestaAccount.findMany({ where: { accountId }, select: { userId: true } }),
      this.followersOf({ kind: 'player', targetId: accountId, event: notification.event })
    ]);

    const ownerIds = owners.map((owner) => owner.userId);
    const followerIds = followers.filter((userId) => !ownerIds.includes(userId));

    const sent = await this.notifyMany({ userIds: ownerIds, notification, dedupeKey });

    if (notification.event !== 'moeGained' || followerIds.length === 0) {
      return sent;
    }

    return sent + (await this.notifyMany({ userIds: followerIds, notification: { ...notification, isFollowed: true }, dedupeKey }));
  }

  async notifyTankFollowers({ tankId, notification, dedupeKey }: NotifyTankFollowersInput): Promise<number> {
    const userIds = await this.followersOf({ kind: 'tank', targetId: BigInt(tankId), event: notification.event });

    return this.notifyMany({ userIds, notification, dedupeKey });
  }

  async broadcast({ notification, dedupeKey }: BroadcastInput): Promise<number> {
    const rows = await this.prisma.notificationSettings.findMany({ where: { events: { has: notification.event } }, select: { userId: true } });

    return this.notifyMany({ userIds: rows.map((row) => row.userId), notification, dedupeKey });
  }

  bonusCodePublished({ code, description }: BonusCodeInput): Promise<number> {
    return this.broadcast({ notification: { event: 'bonusCode', code, description }, dedupeKey: `bonus-${code}` });
  }

  tankDiscounted({ tankId, tankName, discountPercent, offerId }: TankDiscountInput): Promise<number> {
    return this.notifyTankFollowers({
      tankId,
      notification: { event: 'premiumOffer', tankId, tankName, discountPercent },
      dedupeKey: `offer-${tankId}-${offerId}`
    });
  }

  private async followersOf({ kind, targetId, event }: FollowersOfInput): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { kind, targetId, isFollowing: true, OR: [{ events: { has: event } }, { events: { isEmpty: true } }] },
      select: { userId: true }
    });

    return follows.map((follow) => follow.userId);
  }
}
