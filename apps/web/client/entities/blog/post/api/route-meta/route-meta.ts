import { cacheLife } from 'next/cache';

import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { UNAVAILABLE_CACHE_LIFE } from '@/shared/api/query-client';
import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta } from '@/shared/seo/server';

import type { BlogRouteMeta, BlogSitemapItem } from './route-meta.types';

import { getBlogArticle, listBlogPosts } from '../posts';

const lookupBlogMeta = async (slug: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { post } = await getBlogArticle({ slug });

    return {
      title: post.title,
      cover: post.cover,
      excerpt: post.excerpt,
      seoTitle: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      authorName: post.author?.name ?? null,
      contentLocale: post.locale
    };
  });
};

export const blogRouteMeta = async (slug: string): Promise<RouteMeta<BlogRouteMeta>> => routeMeta(lookupBlogMeta(slug));

export const blogSitemapItems = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput): Promise<BlogSitemapItem[]> => {
  'use cache';

  try {
    const { items } = await listBlogPosts({ limit });

    return items.map(({ slug, locale, updatedAt }) => ({ slug, locale, updatedAt }));
  } catch {
    cacheLife(UNAVAILABLE_CACHE_LIFE);

    return [];
  }
};
