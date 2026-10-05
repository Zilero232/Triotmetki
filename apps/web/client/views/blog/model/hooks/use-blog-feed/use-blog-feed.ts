'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { BLOG_CATEGORIES, listBlogPosts } from '@/entities/blog/post';
import { useBlogEditorAccess } from '@/features/blog/editor-access';
import { env } from '@/shared/config';
import { QUERY_KEYS } from '@/shared/constants';
import { nextPageOffset } from '@/shared/lib';

import { BLOG_PAGE } from '../../../config';
import { blogRssHref } from '../../../lib/blog-filters';
import { useBlogFilters } from '../use-blog-filters';
import { useBlogTags } from '../use-blog-tags';

export const useBlogFeed = () => {
  const t = useTranslations('blog');
  const filters = useBlogFilters();
  const tags = useBlogTags();
  const { canEdit } = useBlogEditorAccess();
  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.blog.list(filters.params),
    queryFn: ({ pageParam, signal }) => listBlogPosts({ ...filters.params, limit: BLOG_PAGE.pageSize, offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    staleTime: BLOG_PAGE.staleMs
  });

  const { data, fetchNextPage } = query;
  const posts = data?.pages.flatMap(({ items }) => items) ?? [];

  return {
    ...filters,
    query,
    canEdit,
    tags,
    rssHref: blogRssHref(env.NEXT_PUBLIC_API_URL),
    categoryOptions: [BLOG_PAGE.allCategories, ...BLOG_CATEGORIES].map((value) => ({
      value,
      label: value === BLOG_PAGE.allCategories ? t('filters.all') : t(`categories.${value}`)
    })),
    selectedTags: filters.tag ? [filters.tag] : [],
    posts,
    lead: posts[0] ?? null,
    rest: posts.slice(1),
    total: data?.pages[0]?.total ?? 0,
    loadMore: () => void fetchNextPage()
  };
};
