import type { Metadata } from 'next';

import { isNonNullish } from 'remeda';

import { localePath, LOCALES } from '@/shared/i18n';

import type { PageMetadataInput } from './page-metadata.types';

import { contentAlternates, languageAlternates, siteBrand, siteImage } from '../site-metadata';

export const createPageMetadata = ({
  title,
  description,
  path,
  locale,
  index = false,
  follow = false,
  hasOwnImage = false,
  contentLocale = null
}: PageMetadataInput): Metadata => {
  const brand = siteBrand(locale);
  const ogTitle = LOCALES.some((other) => title.includes(siteBrand(other).name)) ? title : `${title} · ${brand.name}`;
  const canonical = isNonNullish(path) ? localePath({ path, locale: contentLocale ?? locale }) : undefined;
  const images = hasOwnImage ? {} : { images: [siteImage(locale)] };

  return {
    title: { absolute: ogTitle },
    description,
    applicationName: brand.name,
    alternates:
      index && isNonNullish(path)
        ? { canonical, languages: contentLocale ? contentAlternates({ path, locale: contentLocale }) : languageAlternates(path) }
        : null,
    robots: { index, follow },
    openGraph: {
      title: ogTitle,
      description,
      ...(isNonNullish(canonical) ? { url: canonical } : {}),
      type: 'website',
      siteName: brand.name,
      locale: brand.ogLocale,
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => siteBrand(other).ogLocale),
      ...images
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...images
    }
  };
};
