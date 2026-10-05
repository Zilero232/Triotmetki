import type { BotLink, BotReply } from '../../bot-commands';
import type { RenderedNotification } from '../../notifications';

export type NotificationMessageInput = RenderedNotification;

export type ToMessageInput = {
  reply: BotReply;
  connect: BotLink | null;
};
