import { BOT_LOCALE } from '../../bot-commands';

export const BOT = {
  ...BOT_LOCALE,
  fallbackUsername: 'otmetki_bot'
} as const;

export const TELEGRAM_TOKENS = {
  bot: Symbol('TELEGRAM_BOT'),
  i18n: Symbol('TELEGRAM_I18N')
} as const;

export const BOT_API = {
  timeoutSeconds: 15,
  initAttempts: 4,
  initBackoffMs: 3_000,
  maxRetryAttempts: 3,
  maxDelaySeconds: 30
} as const;

export const BOT_COMMANDS = ['me', 'session', 'marks', 'clan', 'tank', 'top', 'lbz', 'next', 'watch', 'settings', 'login', 'help'] as const;

export const EXTERNAL_BOT_COMMANDS = ['watch'] as const;

export const SHARED_COMMAND_OF = {
  me: 'stats',
  session: 'session',
  marks: 'marks',
  clan: 'clan',
  tank: 'tank',
  top: 'top'
} as const;

export const BOT_TEXT_LIMITS = {
  inlineCacheSeconds: 60,
  queryMinLength: 2
} as const;
