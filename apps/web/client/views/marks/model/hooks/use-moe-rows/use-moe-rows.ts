'use client';

import { usePinnedRows } from '@/features/app/pin-rows';

import { filterByName, latestUpdate } from '../../../lib/moe-rows';
import { useFetchAllPages } from '../use-fetch-all-pages';
import { useMoeFeed } from '../use-moe-feed';

export const useMoeRows = () => {
  const { query, all, total, q, pinned, isCollecting, isUntracked } = useMoeFeed();
  const { isPending, filterIds, rowIds } = usePinnedRows({ scope: 'tanks', isPinnedOnly: pinned });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const named = filterByName({ rows: all, query: q });

  useFetchAllPages({ hasNextPage: hasNextPage && !isCollecting, isFetchingNextPage, fetchNextPage });

  return {
    rows: filterIds === null ? named : named.filter(({ vehicle }) => filterIds.includes(String(vehicle.tankId))),
    pinnedIds: rowIds,
    isPinPending: isPending,
    total,
    isUntracked,
    updatedAt: latestUpdate(all),
    query
  };
};
