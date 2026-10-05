import { autoRetry } from '@grammyjs/auto-retry';
import { Bot } from 'grammy';

import type { BotContext } from '../telegram.types';

import { AppConfigService } from '../../../config';
import { BOT_API, TELEGRAM_TOKENS } from '../config/bot.constants';

export const telegramBotProvider = {
  provide: TELEGRAM_TOKENS.bot,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): Bot<BotContext> | null => {
    const token = config.get('TELEGRAM_BOT_TOKEN');

    if (!token) {
      return null;
    }

    const bot = new Bot<BotContext>(token, { client: { timeoutSeconds: BOT_API.timeoutSeconds } });

    bot.api.config.use(autoRetry({ maxRetryAttempts: BOT_API.maxRetryAttempts, maxDelaySeconds: BOT_API.maxDelaySeconds }));

    return bot;
  }
};
