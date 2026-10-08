import type { Locale } from '@/shared/i18n';

import type { BlogPost } from '../posts';

export type BlogRouteMeta = Pick<BlogPost, 'cover' | 'excerpt' | 'publishedAt' | 'title' | 'updatedAt'> & {
  seoTitle: string;
  description: string;
  authorName: string | null;
  contentLocale: Locale;
};

export type BlogSitemapItem = Pick<BlogPost, 'slug' | 'updatedAt'> & {
  locale: Locale;
};
