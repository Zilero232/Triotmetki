'use client';

import { useDebouncedSearch } from '@/entities/search/search';

import { countSearchGroups, groupSearchResults } from '../../../lib/group-results';

export const useSearchResults = (query: string) => {
  const { data, isStale, isFetching, ...state } = useDebouncedSearch({ query, select: (response) => groupSearchResults(response.results) });

  const results = isStale ? undefined : data;

  return {
    ...state,
    results,
    total: results ? countSearchGroups(results) : 0,
    isFetching: isFetching || isStale
  };
};
