import type { NotificationSettings } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { UpdateNotificationsInput } from '../me.types';

import { notificationChannelToDb, notificationEventToDb } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NOTIFICATION_DEFAULTS } from '../../notifications';
import { defaultNotificationSettings, toNotificationSettings } from '../mappers/notification-settings.mappers';

@Injectable()
export class NotificationSettingsWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<NotificationSettings> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { userId } });

    return row ? toNotificationSettings(row) : defaultNotificationSettings();
  }

  async update({ userId, channels, events, quietHours, sessionReport, weeklyDigest }: UpdateNotificationsInput): Promise<NotificationSettings> {
    const data = {
      ...(channels ? { channels: channels.flatMap((channel) => notificationChannelToDb(channel) ?? []) } : {}),
      ...(events ? { events: events.flatMap((event) => notificationEventToDb(event) ?? []) } : {}),
      ...(quietHours === undefined ? {} : { quietHoursStart: quietHours?.start ?? null, quietHoursEnd: quietHours?.end ?? null }),
      ...(sessionReport === undefined ? {} : { sessionReport }),
      ...(weeklyDigest === undefined ? {} : { weeklyDigest })
    };

    const row = await this.prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        channels: [...NOTIFICATION_DEFAULTS.channels],
        events: [...NOTIFICATION_DEFAULTS.events],
        sessionReport: NOTIFICATION_DEFAULTS.sessionReport,
        weeklyDigest: NOTIFICATION_DEFAULTS.weeklyDigest,
        ...data
      },
      update: data
    });

    return toNotificationSettings(row);
  }
}
