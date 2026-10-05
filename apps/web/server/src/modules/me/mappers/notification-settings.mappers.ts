import type { NotificationSettings } from '@otmetki/schemas';

import type { NotificationSettings as NotificationSettingsRow } from '../../../../generated';

import { NOTIFICATION_CHANNEL_FROM_DB, NOTIFICATION_EVENT_FROM_DB } from '../../../common/lib';
import { NOTIFICATION_DEFAULTS } from '../../notifications';

export const toNotificationSettings = (row: NotificationSettingsRow): NotificationSettings => ({
  channels: row.channels.map((channel) => NOTIFICATION_CHANNEL_FROM_DB[channel]),
  events: row.events.map((event) => NOTIFICATION_EVENT_FROM_DB[event]),
  quietHours:
    row.quietHoursStart !== null && row.quietHoursEnd !== null && row.quietHoursStart !== row.quietHoursEnd
      ? { start: row.quietHoursStart, end: row.quietHoursEnd }
      : null,
  sessionReport: row.sessionReport,
  weeklyDigest: row.weeklyDigest
});

export const defaultNotificationSettings = (): NotificationSettings => ({
  channels: NOTIFICATION_DEFAULTS.channels.map((channel) => NOTIFICATION_CHANNEL_FROM_DB[channel]),
  events: NOTIFICATION_DEFAULTS.events.map((event) => NOTIFICATION_EVENT_FROM_DB[event]),
  quietHours: null,
  sessionReport: NOTIFICATION_DEFAULTS.sessionReport,
  weeklyDigest: NOTIFICATION_DEFAULTS.weeklyDigest
});
