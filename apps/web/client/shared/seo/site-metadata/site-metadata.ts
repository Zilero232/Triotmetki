import type { Locale, LocalePathInput } from '@/shared/i18n';

import { SITE } from '@/shared/config';
import { ROUTES } from '@/shared/constants';
import { DEFAULT_LOCALE, localePath, LOCALES } from '@/shared/i18n';

import { OG_SIZE } from '../og';
import { SITE_BRAND, SITE_METADATA } from './site-metadata.constants';

export const absoluteUrl = (path: string): string => {
  const url = new URL(path, SITE.url);

  return url.pathname === '/' ? `${url.origin}${url.search}` : url.toString();
};

export const languageAlternates = (path: string): Record<string, string> => {
  const localized = LOCALES.map((locale) => [locale, localePath({ path, locale })]);

  return Object.fromEntries([...localized, [SITE_METADATA.xDefault, localePath({ path, locale: DEFAULT_LOCALE })]]);
};

export const contentAlternates = (input: LocalePathInput): Record<string, string> => {
  const url = localePath(input);

  return { [input.locale]: url, [SITE_METADATA.xDefault]: url };
};

export const siteBrand = (locale: Locale) => SITE_BRAND[locale];

export const siteImage = (locale: Locale) => ({ url: ROUTES.api.siteCard(locale), ...OG_SIZE, alt: siteBrand(locale).name });
