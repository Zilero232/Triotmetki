import type { MetadataRoute } from 'next';

import { mapValues, unique } from 'remeda';

import { localePath, LOCALES } from '@/shared/i18n';

import type { SitemapContentItem } from './sitemap.types';

import { absoluteUrl, contentAlternates, languageAlternates } from '../site-metadata';
import { SITEMAP } from './sitemap.constants';

export const sitemapEntries = (paths: readonly string[]): MetadataRoute.Sitemap =>
  unique(paths).flatMap((path) => {
    const languages = mapValues(languageAlternates(path), absoluteUrl);

    return LOCALES.map((locale) => ({ url: absoluteUrl(localePath({ path, locale })), alternates: { languages } }));
  });

export const sitemapContentEntries = (items: readonly SitemapContentItem[]): MetadataRoute.Sitemap =>
  items.map(({ path, locale, lastModified }) => {
    const languages = mapValues(contentAlternates({ path, locale }), absoluteUrl);
    const entry = { url: absoluteUrl(localePath({ path, locale })), alternates: { languages } };

    return lastModified === undefined ? entry : { ...entry, lastModified };
  });

export const sitemapUrls = (): string[] => SITEMAP.sections.map((id) => absoluteUrl(`/sitemap/${id}.xml`));
