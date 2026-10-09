'use client';

import type { QueryKey } from '@tanstack/react-query';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { UseOffsetInfiniteListInput } from './use-offset-infinite-list.types';

import { isSameListKey, nextPageOffset } from '../page-offset';

export const useOffsetInfiniteList = <TItem>({ queryKey, queryFn, isKeepingPrevious = true }: UseOffsetInfiniteListInput<TItem>) => {
  const keepSameList = <TData>(previous: TData | undefined, previousQuery?: { queryKey: QueryKey }) => {
    const isSameList = isSameListKey({ previous: previousQuery?.queryKey, next: queryKey });

    return isKeepingPrevious && isSameList ? previous : undefined;
  };

  const { data, error, isPending, isError, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) => queryFn({ offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    placeholderData: keepSameList
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const hasItems = items.length > 0;
  const isFirstPageFailed = isError && !hasItems;
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
    query: { data: isPending || isFirstPageFailed ? undefined : items, isError: isFirstPageFailed, isRefetching: isFetching, refetch: retry }
  };
};
