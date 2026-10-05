import type { NotificationChannel, NotificationEvent, TargetKind } from '../../../generated';
import type { AppNotification, DeliverPayload, Digest, ParsedNotification } from './config/notifications-queue.types';
import type { MarkBattle } from './lib/mark-gains';
import type { NotificationLocale, RenderedNotification } from './lib/notification-copy';

export type NotifyInput = {
  userId: string;
  notification: AppNotification;
  dedupeKey: string;
};

export type NotifyManyInput = {
  userIds: readonly string[];
  notification: AppNotification;
  dedupeKey: string;
};

export type NotifyAccountInput = {
  accountId: bigint;
  notification: AppNotification;
  dedupeKey: string;
};

export type NotifyTankFollowersInput = {
  tankId: number;
  notification: AppNotification;
  dedupeKey: string;
};

export type BroadcastInput = {
  notification: AppNotification;
  dedupeKey: string;
};

export type BonusCodeInput = {
  code: string;
  description: string | null;
};

export type TankDiscountInput = {
  tankId: number;
  tankName: string;
  discountPercent: number | null;
  offerId: string;
};

export type FollowersOfInput = {
  kind: TargetKind;
  targetId: bigint;
  event: NotificationEvent;
};

export type DeliverJob = Omit<DeliverPayload, 'notification'> & {
  notification: ParsedNotification;
};

export type DeliverToInput = {
  userId: string;
  channel: NotificationChannel;
  dedupeKey: string;
  notification: ParsedNotification;
  rendered: RenderedNotification;
  telegramId: bigint | null;
  locale: NotificationLocale;
  email: string;
};

export type ChannelSendInput = Omit<DeliverToInput, 'dedupeKey' | 'notification'>;

export type ClaimNotificationInput = Pick<DeliverToInput, 'channel' | 'dedupeKey' | 'notification' | 'rendered' | 'userId'>;

export type NotificationClaim = { status: 'claimed'; id: string } | { status: 'inFlight' } | { status: 'sent' };

export type SendOnceInput = ClaimNotificationInput & {
  send: () => Promise<unknown>;
};

export type WebPushInput = {
  userId: string;
  title: string;
  body: string;
  url: string;
};

export type NotificationEmailInput = {
  to: string;
  locale: NotificationLocale;
  rendered: RenderedNotification;
};

export type DigestEmailInput = {
  to: string;
  locale: NotificationLocale;
  rendered: RenderedNotification;
  digest: Digest;
};

export type DigestEmailProps = {
  locale: NotificationLocale;
  title: string;
  body: string;
  url: string;
  cta: string;
};

export type InboxListInput = {
  userId: string;
  limit: number;
  before?: string;
};

export type MarkReadInput = {
  userId: string;
  ids?: string[];
};

export type SubscribePushInput = {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string | null;
};

export type UnsubscribePushInput = {
  userId: string;
  endpoint: string;
};

export type PreviousMarksInput = {
  battles: MarkBattle[];
  since: Date;
};

export type DigestOfInput = {
  userId: string;
  since: Date;
};

export type FirstWinRemindInput = {
  userId: string;
  now: Date;
  resetAt: Date;
};
