import type { NotificationChannel, NotificationEvent } from '../../../../../generated';
import type { QuietHours } from '../quiet-hours/quiet-hours.types';

export type RoutingSettings = {
  channels: readonly NotificationChannel[];
  events: readonly NotificationEvent[];
  quietHours: QuietHours | null;
  sessionReport: boolean;
  weeklyDigest: boolean;
};

export type ChannelAvailability = {
  telegram: boolean;
  webPush: boolean;
  email: boolean;
};

export type RouteEventInput = {
  event: NotificationEvent;
  settings: RoutingSettings;
  available: ChannelAvailability;
};

export type RouteDigestInput = {
  settings: RoutingSettings;
  available: ChannelAvailability;
};

export type SplitQuietInput = {
  channels: readonly NotificationChannel[];
  delayMs: number;
};

export type SplitChannels = {
  now: NotificationChannel[];
  later: NotificationChannel[];
};

export type IsAvailableInput = {
  channel: NotificationChannel;
  available: ChannelAvailability;
};
