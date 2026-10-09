'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getBestBattleFacets, listBestBattles } from '@/entities/battle/best-battle';
import { QUERY_KEYS } from '@/shared/constants';

import { BEST_BATTLES_VIEW } from '../../../config';
import { hasBattleFilters, toBestBattlesQuery } from '../../../lib';
import { useBestBattlesState } from '../use-best-battles-state';

export const useBestBattles = () => {
  const [state, setState] = useBestBattlesState();
  const query = toBestBattlesQuery(state);
  const feed = useInfiniteQuery({
    queryKey: QUERY_KEYS.bestBattles.list(query),
    queryFn: ({ signal, pageParam }) => listBestBattles({ ...query, cursor: pageParam, signal }),
    initialPageParam: String(BEST_BATTLES_VIEW.firstOffset),
    getNextPageParam: (page) => page.nextCursor,
    placeholderData: keepPreviousData,
    staleTime: BEST_BATTLES_VIEW.staleMs
  });

  const {
    data: facets,
    isPending: isFacetsPending,
    isError: isFacetsError
  } = useQuery({
    queryKey: QUERY_KEYS.bestBattles.facets(state.period),
    queryFn: ({ signal }) => getBestBattleFacets({ period: state.period, signal }),
    staleTime: BEST_BATTLES_VIEW.staleMs
  });

  const { data: feedData, fetchNextPage } = feed;
  const battles = feedData?.pages.flatMap((page) => page.items) ?? [];

  return {
    metric: state.metric,
    battles,
    podium: battles.slice(0, BEST_BATTLES_VIEW.podiumSize),
    facets: facets && facets.battles > 0 ? facets : null,
    isFacetsUnknown: isFacetsPending || isFacetsError,
    isFiltered: hasBattleFilters(state),
    feed,
    loadMore: () => void fetchNextPage(),
    reset: () => void setState({ tank: null, map: null, medal: null })
  };
};
