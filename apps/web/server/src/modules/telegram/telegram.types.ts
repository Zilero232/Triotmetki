import type { I18nFlavor } from '@grammyjs/i18n';
import type { PlaylistItem, PlaylistReason } from '@otmetki/schemas';
import type { Context } from 'grammy';
import type { Update } from 'grammy/types';

import type { NotificationChannel, NotificationEvent, NotificationSettings, Prisma } from '../../../generated';
import type { TelegramIdentity } from '../../lib/auth';
import type { BotLocale } from '../bot-commands';
import type { EXTERNAL_BOT_COMMANDS, SHARED_COMMAND_OF } from './config/bot.constants';

export type { TelegramIdentity } from '../../lib/auth';
export type { BotLocale } from '../bot-commands';

export type LinkedChat = {
  userId: string;
  telegramId: bigint;
  accountId: bigint | null;
  nickname: string | null;
  locale: BotLocale;
};

type ChatFlavor = {
  chat$: LinkedChat | null;
};

export type BotContext = Context & I18nFlavor & ChatFlavor;

export type BotHandler = (ctx: BotContext) => Promise<void>;

export type ExternalBotCommand = (typeof EXTERNAL_BOT_COMMANDS)[number];

export type ExternalCommandSpec = {
  command: ExternalBotCommand;
  run: BotHandler;
};

export type RunExternalCommandInput = {
  command: ExternalBotCommand;
  ctx: BotContext;
};

export type BotCommandSpec = {
  command: string;
  run: BotHandler;
};

export type ConsumeLinkCodeInput = {
  code: string;
  identity: TelegramIdentity;
};

export type SendNotificationInput = {
  telegramId: bigint;
  locale: BotLocale;
  title: string;
  body: string;
  url: string | null;
};

export type SendTextInput = {
  telegramId: bigint;
  text: string;
};

export type TxUserInput = {
  tx: Prisma.TransactionClient;
  userId: string;
};

export type GuardInput = {
  ctx: BotContext;
  run: () => Promise<void>;
};

export type ConsumeInput = {
  ctx: BotContext;
  identity: TelegramIdentity;
  code: string;
};

export type LinkPromptInput = Omit<ConsumeInput, 'identity'>;

export type LinkCodePreview = {
  code: string;
  accountName: string;
};

export type SettingsSnapshot = Pick<NotificationSettings, 'channels' | 'events' | 'weeklyDigest'>;

export type MenuLabelInput = {
  isOn: boolean;
  text: string;
};

export type ToggleChannelInput = {
  userId: string;
  channel: NotificationChannel;
};

export type ToggleEventInput = {
  userId: string;
  event: NotificationEvent;
};

export type SaveSettingsInput = {
  userId: string;
  data: Partial<SettingsSnapshot>;
};

export type PlaylistReasonInput = {
  ctx: BotContext;
  item: PlaylistItem;
  reason: PlaylistReason;
};

export type SharedCommandInput = {
  ctx: BotContext;
  command: keyof typeof SHARED_COMMAND_OF;
};

export type TelegramWebhookInput = {
  update: Update;
  secret: string | undefined;
};
