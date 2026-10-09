import * as z from 'zod';

import { countSchema, httpsUrlSchema, isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { INBOX } from './notifications.constants';
import { isPushServiceUrl } from './push-service';

export const notificationChannelSchema = z.enum(['telegram', 'email', 'web_push', 'site']);

export const notificationEventSchema = z
  .enum([
    'moe_gained',
    'moe_threshold_dropped',
    'mastery_gained',
    'session_finished',
    'clan_roster_changed',
    'clan_event_reminder',
    'clan_weekly_report',
    'bonus_code',
    'premium_offer',
    'tank_changed',
    'goal_reached',
    'badge_awarded',
    'challenge_resolved',
    'watchlist_digest',
    'tank_returned',
    'competition_finished',
    'first_win_available',
    'replay_overflow',
    'streamer_live',
    'tank_level_up',
    'tank_challenge_done',
    'plus_checkout_open',
    'lesta_relink_required'
  ])
  .describe('Every notification kind: the settings toggles, the inbox items and the Telegram, e-mail and web-push messages use this one list');

const hour = z.number().int().min(0).max(23);

export const quietHoursSchema = z
  .object({ start: hour, end: hour })
  .refine(({ start, end }) => start !== end, { message: 'Quiet hours must not start and end at the same hour' });

export const notificationSettingsSchema = z.object({
  channels: z.array(notificationChannelSchema),
  events: z.array(notificationEventSchema),
  quietHours: quietHoursSchema.nullable(),
  sessionReport: z.boolean(),
  weeklyDigest: z.boolean()
});

export const updateNotificationSettingsSchema = notificationSettingsSchema.partial();

export const inboxQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(INBOX.maxLimit).default(INBOX.defaultLimit),
  before: isoDateTimeSchema.optional()
});

export const inboxItemSchema = z.object({
  id: uuidSchema,
  event: notificationEventSchema,
  title: z.string(),
  body: z.string(),
  url: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  readAt: isoDateTimeSchema.nullable()
});

export const inboxPageSchema = z.object({
  items: z.array(inboxItemSchema),
  unread: countSchema
});

export const markReadSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(INBOX.maxLimit).optional()
});

export const markReadResultSchema = z.object({
  updated: countSchema
});

export const pushKeySchema = z.object({
  publicKey: z.string().nullable()
});

export const pushSubscriptionSchema = z.object({
  endpoint: httpsUrlSchema.refine(isPushServiceUrl, { message: 'Not a known web push service' }),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) })
});

export const pushUnsubscribeSchema = pushSubscriptionSchema.pick({ endpoint: true });
