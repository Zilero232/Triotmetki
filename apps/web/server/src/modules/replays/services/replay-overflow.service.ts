import { Injectable, Logger } from '@nestjs/common';

import type { OverflowOwner, SettleOverflowInput } from '../replays.types';

import { isoDay } from '../../../common/lib';
import { ObjectStorage, PrismaService } from '../../../core';
import { accessEndsAt, isEntitled, PLUS_SUBSCRIPTION } from '../../billing';
import { NotificationService } from '../../notifications';
import { REPLAY_OVERFLOW } from '../config';
import { overflowPlan, overflowReplayIds } from '../lib';

@Injectable()
export class ReplayOverflowService {
  private readonly logger = new Logger(ReplayOverflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly notifications: NotificationService
  ) {}

  async run(now: Date): Promise<number> {
    const owners = await this.ownersOverQuota();

    if (owners.length === 0) {
      return 0;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: { in: owners.map((owner) => owner.userId) }, product: PLUS_SUBSCRIPTION.product },
      select: { userId: true, status: true, currentPeriodEnd: true }
    });

    const subscriptionOf = new Map(subscriptions.map((subscription) => [subscription.userId, subscription]));
    let deleted = 0;

    for (const owner of owners) {
      const subscription = subscriptionOf.get(owner.userId) ?? null;
      const accessEndedAt = subscription && !isEntitled({ subscription, now }) ? accessEndsAt(subscription) : null;

      if (accessEndedAt) {
        deleted += await this.settle({ ...owner, accessEndedAt, now });
      }
    }

    return deleted;
  }

  private async ownersOverQuota(): Promise<OverflowOwner[]> {
    const groups = await this.prisma.replay.groupBy({
      by: ['uploaderUserId'],
      where: { uploaderUserId: { not: null } },
      _count: { _all: true },
      having: { uploaderUserId: { _count: { gt: REPLAY_OVERFLOW.keep } } }
    });

    return groups.flatMap((group) => (group.uploaderUserId ? [{ userId: group.uploaderUserId, stored: group._count._all }] : []));
  }

  private async settle({ userId, stored, accessEndedAt, now }: SettleOverflowInput): Promise<number> {
    const plan = overflowPlan({ accessEndedAt, now });

    if (plan.kind === 'notice') {
      await this.notifications.notify({
        userId,
        notification: { event: 'replayOverflow', stored, keep: REPLAY_OVERFLOW.keep, daysLeft: plan.daysLeft, deleteAt: isoDay(plan.deleteAt) },
        dedupeKey: `${REPLAY_OVERFLOW.dedupePrefix}-${isoDay(plan.deleteAt)}-${plan.daysLeft}`
      });
    }

    return plan.kind === 'delete' ? this.deleteOverflow(userId) : 0;
  }

  private async deleteOverflow(userId: string): Promise<number> {
    const replays = await this.prisma.replay.findMany({
      where: { uploaderUserId: userId },
      select: { id: true, createdAt: true, storageKey: true, timelineKey: true }
    });

    const doomed = new Set(overflowReplayIds({ replays, keep: REPLAY_OVERFLOW.keep }));
    const removed = replays.filter((replay) => doomed.has(replay.id));

    const { count } = await this.prisma.replay.deleteMany({ where: { id: { in: [...doomed] }, uploaderUserId: userId } });
    let orphans = 0;

    for (const key of removed.flatMap((replay) => (replay.timelineKey ? [replay.storageKey, replay.timelineKey] : [replay.storageKey]))) {
      try {
        await this.storage.remove(key);
      } catch {
        orphans += 1;
      }
    }

    if (orphans > 0) {
      this.logger.warn(`${orphans} storage objects of ${userId}'s deleted overflow replays were not removed`);
    }

    this.logger.log(`deleted ${count} overflow replays of ${userId}`);

    return count;
  }
}
