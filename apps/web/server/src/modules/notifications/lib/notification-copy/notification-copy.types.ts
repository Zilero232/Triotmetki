import type { TranslationVariables } from '@grammyjs/i18n';

import type { NOTIFICATION_COPY, NOTIFICATION_GROUPS } from '../../config/copy.constants';
import type { Digest, ParsedNotification } from '../../config/notifications-queue.types';

export type NotificationLocale = (typeof NOTIFICATION_COPY.locales)[number];

type CopyValues = TranslationVariables;

export type RenderedNotification = {
  title: string;
  body: string;
  url: string;
};

export type RenderNotificationInput = {
  notification: ParsedNotification;
  locale: NotificationLocale;
  webUrl: string;
};

export type RenderDigestInput = {
  digest: Digest;
  locale: NotificationLocale;
  webUrl: string;
};

export type NotificationTextInput = {
  locale: NotificationLocale;
  key: string;
  values?: CopyValues;
};

export type NotificationMessage = {
  message: string;
  values: CopyValues;
  path: string;
};

export type LinkInput = {
  webUrl: string;
  path: string;
};

type NotificationOf<Events extends readonly ParsedNotification['event'][]> = Extract<ParsedNotification, { event: Events[number] }>;

export type TankNotification = NotificationOf<typeof NOTIFICATION_GROUPS.tank>;

export type PlayerNotification = NotificationOf<typeof NOTIFICATION_GROUPS.player>;

export type CommunityNotification = NotificationOf<typeof NOTIFICATION_GROUPS.community>;

export type AccountNotification = NotificationOf<typeof NOTIFICATION_GROUPS.account>;
