import type { MetadataRoute } from 'next';

import { localePath, LOCALES } from '@/shared/i18n';
import { SITEMAP, sitemapUrls } from '@/shared/seo';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: [...SITEMAP.allow],
    disallow: [...new Set(SITEMAP.disallow.flatMap((path) => LOCALES.map((locale) => localePath({ path, locale }))))]
  },
  sitemap: sitemapUrls()
});

export default robots;
