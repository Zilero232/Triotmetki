import type { z } from 'zod';

import type {
  inboxItemSchema,
  inboxPageSchema,
  inboxQuerySchema,
  markReadResultSchema,
  markReadSchema,
  notificationChannelSchema,
  notificationEventSchema,
  notificationSettingsSchema,
  pushKeySchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema
} from './notifications.schemas';

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationEvent = z.infer<typeof notificationEventSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
export type InboxPage = z.infer<typeof inboxPageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type MarkReadResult = z.infer<typeof markReadResultSchema>;
export type PushKey = z.infer<typeof pushKeySchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
