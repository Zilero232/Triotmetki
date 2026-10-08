'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import type { UseOffsetInfiniteListInput } from './use-offset-infinite-list.types';

import { nextPageOffset } from '../page-offset';

export const useOffsetInfiniteList = <TItem>({ queryKey, queryFn, isKeepingPrevious = true }: UseOffsetInfiniteListInput<TItem>) => {
  const { data, error, isPending, isError, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) => queryFn({ offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    placeholderData: isKeepingPrevious ? keepPreviousData : undefined
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const hasItems = items.length > 0;
  const retry = () => void refetch();

  return {
    items,
    total: data?.pages[0]?.total ?? 0,
    isPending,
    isError,
    error,
    isRetrying: isFetching,
    hasNextPage,
    hasMore: hasNextPage || (isError && hasItems),
    isFetchingNextPage,
    loadMore: () => void fetchNextPage(),
    retry,
    query: { data: isPending ? undefined : items, isError: isError && !hasItems, isRefetching: isFetching, refetch: retry }
  };
};
