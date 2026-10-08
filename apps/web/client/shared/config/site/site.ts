import type { ModDistribution } from './site.types';

import { env } from '../client-env';

export const SITE = {
  url: new URL(env.NEXT_PUBLIC_SITE_URL).origin,
  name: 'Три отметки',
  title: 'Три отметки',
  description: 'Статистика «Мира танков»: игроки, танки, отметки, топы, кланы и инструменты в одном месте.',
  locale: 'ru_RU',
  lang: 'ru-RU',
  copyrightYear: 2026,
  themeColor: {
    light: '#f1f1f3',
    dark: '#18181b'
  },
  en: {
    title: 'Three Marks',
    description: 'Mir Tankov stats: players, tanks, marks of excellence, leaderboards, clans and tools in one place.',
    locale: 'en_US',
    lang: 'en-US'
  }
} as const;

export const EXTERNAL_LINKS = {
  game: 'https://tanki.su',
  lestaSupport: 'https://lesta.ru/support/ru/',
  lestaForbiddenMods: 'https://lesta.ru/support/ru/products/mt/article/15152/',
  lestaFairPlayReport: 'https://tanki.su/ru/news/notifications/chestnaya-igra-leto-2026/'
} as const;

export const TELEGRAM_BOT = {
  username: 'OtmetkiBot',
  url: 'https://t.me/OtmetkiBot'
} as const;

export const LEGAL = {
  isDraft: true
} as const;

export const SUPPORT = {
  email: 'support@triotmetki.ru',
  telegramUrl: TELEGRAM_BOT.url
} as const;

export const MOD_DISTRIBUTION: ModDistribution = {
  managerUrl: 'https://triotmetki.ru/downloads/otmetki-manager-setup.exe',
  managerFileName: 'otmetki-manager-setup.exe'
};
