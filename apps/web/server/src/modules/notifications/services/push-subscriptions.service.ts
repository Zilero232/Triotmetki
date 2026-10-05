import { Injectable } from '@nestjs/common';

import type { SubscribePushInput, UnsubscribePushInput } from '../notifications.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { isUniqueViolation, PrismaService } from '../../../core';
import { vapidDetails } from '../lib/web-push-config';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService
  ) {}

  publicKey(): { publicKey: string | null } {
    return { publicKey: this.vapid()?.publicKey ?? null };
  }

  async subscribe({ userId, endpoint, keys, userAgent }: SubscribePushInput): Promise<void> {
    if (!this.vapid()) {
      throw new AppNotFoundException('INTEGRATION_UNAVAILABLE', 'Web push is not configured on this server');
    }

    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true, p256dh: true, auth: true } });

    if (!existing) {
      await this.create({ userId, endpoint, keys, userAgent });

      return;
    }

    const holdsKeys = existing.p256dh === keys.p256dh && existing.auth === keys.auth;

    if (existing.userId !== userId && !holdsKeys) {
      throw new AppConflictException('CONFLICT', 'This push endpoint belongs to another account');
    }

    await this.prisma.pushSubscription.update({ where: { endpoint }, data: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent } });
  }

  private async create({ userId, endpoint, keys, userAgent }: SubscribePushInput): Promise<void> {
    try {
      await this.prisma.pushSubscription.create({ data: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'This push endpoint was just subscribed');
      }

      throw error;
    }
  }

  async unsubscribe({ userId, endpoint }: UnsubscribePushInput): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  private vapid() {
    return vapidDetails({
      VAPID_PUBLIC_KEY: this.config.get('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY: this.config.get('VAPID_PRIVATE_KEY'),
      VAPID_SUBJECT: this.config.get('VAPID_SUBJECT')
    });
  }
}
