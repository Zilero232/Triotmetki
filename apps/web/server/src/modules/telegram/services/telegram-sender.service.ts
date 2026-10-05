import { I18n } from '@grammyjs/i18n';
import { fmt, FormattedString } from '@grammyjs/parse-mode';
import { Inject, Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

import type { BotContext, SendNotificationInput, SendTextInput } from '../telegram.types';

import { TELEGRAM_TOKENS } from '../config/bot.constants';
import { openButton } from '../lib/keyboard/keyboard';

@Injectable()
export class TelegramSenderService {
  constructor(
    @Inject(TELEGRAM_TOKENS.bot) private readonly bot: Bot<BotContext> | null,
    @Inject(TELEGRAM_TOKENS.i18n) private readonly i18n: I18n<BotContext>
  ) {}

  get isEnabled(): boolean {
    return this.bot !== null;
  }

  async sendNotification({ telegramId, locale, title, body, url }: SendNotificationInput): Promise<void> {
    if (!this.bot) {
      return;
    }

    const message = fmt`${FormattedString.bold(title)}\n${body}`;
    const markup = url ? openButton({ label: this.i18n.t(locale, 'notification-open'), url }) : undefined;

    await this.bot.api.sendMessage(Number(telegramId), message.text, {
      entities: message.entities,
      reply_markup: markup,
      link_preview_options: { is_disabled: true }
    });
  }

  async sendText({ telegramId, text }: SendTextInput): Promise<void> {
    await this.bot?.api.sendMessage(Number(telegramId), text, { link_preview_options: { is_disabled: true } });
  }
}
