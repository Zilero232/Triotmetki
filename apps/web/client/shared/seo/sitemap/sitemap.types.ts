import type { LocalePathInput } from '@/shared/i18n';

import type { SITEMAP } from './sitemap.constants';

export type SitemapContentItem = LocalePathInput & {
  lastModified?: string;
};

export type SitemapSection = (typeof SITEMAP.sections)[number];

export type SitemapProps = {
  id: Promise<string>;
};
