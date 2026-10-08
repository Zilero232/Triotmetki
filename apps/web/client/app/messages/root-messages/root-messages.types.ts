import type { Locale } from '@/shared/i18n';

export type ScopedMessagesInput = {
  locale: Locale;
  paths: readonly string[];
};
