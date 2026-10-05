import type { I18n } from '@grammyjs/i18n';

import type { BotContext } from '../telegram.types';

import { createFluentStore, resolveBotLocale } from '../../bot-commands';
import { TELEGRAM_TOKENS } from '../config/bot.constants';
import { BOT_LOCALE_FILES } from '../config/locales.constants';

export const createBotI18n = (): I18n<BotContext> =>
  createFluentStore<BotContext>({
    files: BOT_LOCALE_FILES,
    localeNegotiator: (ctx) => ctx.chat$?.locale ?? resolveBotLocale(ctx.from?.language_code)
  });

export const telegramI18nProvider = {
  provide: TELEGRAM_TOKENS.i18n,
  useFactory: createBotI18n
};
