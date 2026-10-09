'use client';

import { useEffect } from 'react';

import type { UseFetchAllPagesInput } from './use-fetch-all-pages.types';

export const useFetchAllPages = ({ hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage }: UseFetchAllPagesInput) => {
  useEffect(() => {
    const canFetch = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;

    if (canFetch) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);
};
