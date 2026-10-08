'use client';

import type { SearchResponse } from '@otmetki/schemas';

import { SEARCH } from '@otmetki/schemas';
import { useDebounceValue } from '@siberiacancode/reactuse';
import { useQuery } from '@tanstack/react-query';

import type { UseDebouncedSearchInput } from './use-debounced-search.types';

import { SEARCH_REQUEST, searchQueryOptions } from '../../../api';

export const useDebouncedSearch = <T = SearchResponse>({ query, select }: UseDebouncedSearchInput<T>) => {
  const trimmed = query.trim();
  const debounced = useDebounceValue(trimmed, SEARCH_REQUEST.debounceMs);
  const { data, isFetching, isError, isPlaceholderData, refetch } = useQuery({ ...searchQueryOptions(debounced), select });

  const isEnabled = debounced.length >= SEARCH.minLength;
  const isStale = isPlaceholderData || trimmed !== debounced;

  return {
    data: isEnabled ? data : undefined,
    isEnabled,
    isFetching: isEnabled && isFetching,
    isStale: isEnabled && isStale,
    isError,
    retry: () => refetch()
  };
};
