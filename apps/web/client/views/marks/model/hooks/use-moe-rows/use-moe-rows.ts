'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { usePinnedRows } from '@/features/app/pin-rows';
import { useVehicleFilters } from '@/features/tank/filter-vehicles';

import { marksQueries } from '../../../api';
import { moeFeedParams } from '../../../lib/moe-feed-params';
import { areThresholdsMissing, filterByName, latestUpdate } from '../../../lib/moe-rows';
import { useFetchAllPages } from '../use-fetch-all-pages';
import { useMarksUrlState } from '../use-marks-url-state';

export const useMoeRows = () => {
  const filters = useVehicleFilters();
  const [{ sort, order, q, pinned }] = useMarksUrlState();
  const { isPending, filterIds, rowIds } = usePinnedRows({ scope: 'tanks', isPinnedOnly: pinned });

  const query = useInfiniteQuery({ ...marksQueries.feed(moeFeedParams({ vehicle: filters.query, sort, order })), placeholderData: keepPreviousData });

  const { data: feed, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const all = feed?.pages.flatMap(({ items }) => items) ?? [];
  const total = feed?.pages[0]?.total ?? 0;
  const isCollecting = areThresholdsMissing({ rows: all, sort, isComplete: !hasNextPage });
  const named = filterByName({ rows: all, query: q });

  useFetchAllPages({ hasNextPage: hasNextPage && !isCollecting, isFetchingNextPage, fetchNextPage });

  return {
    rows: filterIds === null ? named : named.filter(({ vehicle }) => filterIds.includes(String(vehicle.tankId))),
    pinnedIds: rowIds,
    isPinPending: isPending,
    total,
    isUntracked: isCollecting || (feed !== undefined && total === 0 && !filters.isActive && q.trim() === ''),
    updatedAt: latestUpdate(all),
    query
  };
};
