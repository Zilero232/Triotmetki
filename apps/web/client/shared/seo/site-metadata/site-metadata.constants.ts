import { SITE } from '@/shared/config';

export const SITE_METADATA = {
  xDefault: 'x-default'
} as const;

export const SITE_BRAND = {
  ru: { name: SITE.name, ogLocale: SITE.locale },
  en: { name: SITE.en.title, ogLocale: SITE.en.locale }
} as const;
