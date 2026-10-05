import type { Locale, Messages } from '@/shared/i18n';

declare module 'use-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
