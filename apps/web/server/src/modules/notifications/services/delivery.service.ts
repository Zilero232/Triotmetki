import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { match } from 'ts-pattern';

import type { NotificationSettings } from '../../../../generated';
import type { DeliverPayload, DigestPayload } from '../config/notifications-queue.types';
import type { ChannelAvailability, RoutingSettings } from '../lib/channel-routing/channel-routing.types';
import type { ChannelSendInput, DeliverJob, DeliverToInput } from '../notifications.types';

import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { TelegramSenderService } from '../../telegram';
import { NOTIFICATION_DEFAULTS } from '../config/delivery.constants';
import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';
import { WEEKLY_DIGEST } from '../config/watchers.constants';
import { routeDigest, routeEvent, splitQuiet } from '../lib/channel-routing/channel-routing';
import { renderDigest, renderNotification, resolveNotificationLocale } from '../lib/notification-copy/notification-copy';
import { quietDelayMs } from '../lib/quiet-hours/quiet-hours';
import { EmailService } from './email.service';
import { NotificationLedgerService } from './notification-ledger.service';
import { WebPushService } from './web-push.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly telegram: TelegramSenderService,
    private readonly webPush: WebPushService,
    private readonly email: EmailService,
    @Inject(REDIS) private readonly redis: Redis,
    @InjectQueue(NOTIFICATIONS_QUEUE.deliver) private readonly queue: Queue<DeliverPayload>,
    private readonly ledger: NotificationLedgerService
  ) {}

  async deliver(job: DeliverJob): Promise<number> {
    const { userId, dedupeKey, notification, onlyChannels } = job;
    const user = await this.recipient(userId);

    if (!user) {
      return 0;
    }

    const settings = this.routingSettings(user.notificationSettings);
    const available: ChannelAvailability = {
      telegram: this.telegram.isEnabled && user.telegramAccount !== null,
      webPush: this.webPush.isEnabled && user._count.pushSubscriptions > 0,
      email: this.email.canReach(user.email)
    };

    const routed = routeEvent({ event: notification.event, settings, available });
    let channels = onlyChannels ? routed.filter((channel) => onlyChannels.includes(channel)) : routed;

    if (!onlyChannels) {
      const delayMs = quietDelayMs({ quietHours: settings.quietHours, now: new Date(), timeZone: user.timezone });
      const { now, later } = splitQuiet({ channels, delayMs });

      if (later.length > 0) {
        await this.queue.add(
          NOTIFICATIONS_JOB.deliver.event,
          { userId, dedupeKey, notification, onlyChannels: later },
          { delay: delayMs, jobId: `${userId}__${dedupeKey}__later`.replaceAll(':', '_') }
        );
      }

      channels = now;
    }

    const locale = resolveNotificationLocale(user.locale);
    const rendered = renderNotification({ notification, locale, webUrl: this.config.get('WEB_URL') });
    const telegramId = user.telegramAccount?.telegramId ?? null;

    const results = await Promise.allSettled(
      channels.map((channel) => this.deliverTo({ userId, channel, dedupeKey, notification, rendered, telegramId, locale, email: user.email }))
    );

    const failures = results.filter((result) => result.status === 'rejected');

    if (failures.length > 0) {
      throw new Error(`${failures.length} of ${channels.length} channels failed for ${userId}/${dedupeKey}`);
    }

    return channels.length;
  }

  async deliverDigest({ userId, weekKey, digest }: DigestPayload): Promise<number> {
    const user = await this.recipient(userId);

    if (!user) {
      return 0;
    }

    const settings = this.routingSettings(user.notificationSettings);
    const telegramId = user.telegramAccount?.telegramId ?? null;
    const channels = routeDigest({
      settings,
      available: { email: this.email.canReach(user.email), telegram: this.telegram.isEnabled && telegramId !== null, webPush: false }
    });

    if (channels.length === 0) {
      return 0;
    }

    const locale = resolveNotificationLocale(user.locale);
    const rendered = renderDigest({ digest, locale, webUrl: this.config.get('WEB_URL') });
    const failures: unknown[] = [];
    let sent = 0;

    for (const channel of channels) {
      const key = `${WEEKLY_DIGEST.dedupePrefix}${userId}:${weekKey}:${channel}`;

      if ((await this.redis.set(key, '1', 'EX', WEEKLY_DIGEST.dedupeTtlSeconds, 'NX')) !== 'OK') {
        continue;
      }

      try {
        await match(channel)
          .with('email', () => this.email.sendNotification({ to: user.email, locale, rendered }))
          .with('telegram', () => (telegramId === null ? undefined : this.telegram.sendNotification({ telegramId, locale, ...rendered })))
          .otherwise(() => undefined);

        sent += 1;
      } catch (error) {
        await this.redis.del(key);
        failures.push(error);
      }
    }

    if (failures.length > 0) {
      throw failures[0];
    }

    return sent;
  }

  private async deliverTo(input: DeliverToInput): Promise<void> {
    const { userId, channel, dedupeKey, notification, rendered } = input;

    await this.ledger.sendOnce({ userId, channel, dedupeKey, notification, rendered, send: () => this.send(input) });
  }

  private async send({ userId, channel, rendered, telegramId, locale, email }: ChannelSendInput): Promise<void> {
    await match(channel)
      .with('site', () => undefined)
      .with('telegram', () => (telegramId === null ? undefined : this.telegram.sendNotification({ telegramId, locale, ...rendered })))
      .with('webPush', () => this.webPush.sendToUser({ userId, ...rendered }))
      .with('email', () => this.email.sendNotification({ to: email, locale, rendered }))
      .exhaustive();
  }

  private recipient(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        locale: true,
        timezone: true,
        notificationSettings: true,
        telegramAccount: { select: { telegramId: true } },
        _count: { select: { pushSubscriptions: true } }
      }
    });
  }

  private routingSettings(row: NotificationSettings | null): RoutingSettings {
    if (!row) {
      return {
        channels: NOTIFICATION_DEFAULTS.channels,
        events: NOTIFICATION_DEFAULTS.events,
        quietHours: null,
        sessionReport: NOTIFICATION_DEFAULTS.sessionReport,
        weeklyDigest: NOTIFICATION_DEFAULTS.weeklyDigest
      };
    }

    const hasQuiet = row.quietHoursStart !== null && row.quietHoursEnd !== null && row.quietHoursStart !== row.quietHoursEnd;

    return {
      channels: row.channels,
      events: row.events,
      quietHours: hasQuiet ? { start: row.quietHoursStart ?? 0, end: row.quietHoursEnd ?? 0 } : null,
      sessionReport: row.sessionReport,
      weeklyDigest: row.weeklyDigest
    };
  }
}
