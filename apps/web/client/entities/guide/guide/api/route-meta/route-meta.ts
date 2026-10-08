import { cacheLife } from 'next/cache';
import { isIncludedIn } from 'remeda';

import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { UNAVAILABLE_CACHE_LIFE } from '@/shared/api/query-client';
import { LOCALES } from '@/shared/i18n';
import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta } from '@/shared/seo/server';

import type { GuideRouteMeta, GuideSitemapItem } from './route-meta.types';

import { getGuide, listGuides } from '../guides';

const lookupGuideMeta = async (slug: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { title, status, locale } = await getGuide({ slug });

    return { title, isPublished: status === 'published', contentLocale: isIncludedIn(locale, LOCALES) ? locale : null };
  });
};

export const guideRouteMeta = async (slug: string): Promise<RouteMeta<GuideRouteMeta>> => routeMeta(lookupGuideMeta(slug));

export const guideSitemapItems = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput): Promise<GuideSitemapItem[]> => {
  'use cache';

  try {
    const { items } = await listGuides({ limit, sort: 'popular' });

    return items.flatMap(({ slug, locale, status, updatedAt }) =>
      status === 'published' && isIncludedIn(locale, LOCALES) ? [{ slug, locale, updatedAt }] : []
    );
  } catch {
    cacheLife(UNAVAILABLE_CACHE_LIFE);

    return [];
  }
};
