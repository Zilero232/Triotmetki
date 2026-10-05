import type { Context } from 'grammy';

import { I18n } from '@grammyjs/i18n';
import { fileURLToPath } from 'node:url';
import { entries } from 'remeda';

import type { CreateFluentStoreInput } from './fluent-store.types';

import { BOT_LOCALE } from '../../config/bot-commands.constants';

export const createFluentStore = <C extends Context = Context>({ files, localeNegotiator }: CreateFluentStoreInput<C>): I18n<C> => {
  const i18n = new I18n<C>({
    defaultLocale: BOT_LOCALE.fallbackLocale,
    fluentBundleOptions: { useIsolating: false },
    ...(localeNegotiator ? { localeNegotiator } : {})
  });

  for (const [locale, file] of entries(files)) {
    i18n.loadLocaleSync(locale, { filePath: fileURLToPath(file) });
  }

  return i18n;
};
