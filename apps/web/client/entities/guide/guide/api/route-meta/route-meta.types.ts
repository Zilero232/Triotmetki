import type { Locale } from '@/shared/i18n';

import type { Guide } from '../guides';

export type GuideRouteMeta = Pick<Guide, 'title'> & {
  isPublished: boolean;
  contentLocale: Locale | null;
};

export type GuideSitemapItem = Pick<Guide, 'slug' | 'updatedAt'> & {
  locale: Locale;
};
