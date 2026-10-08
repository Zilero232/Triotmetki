'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { useVehicleFilters } from '@/features/tank/filter-vehicles';

import { marksQueries } from '../../../api';
import { moeFeedParams } from '../../../lib/moe-feed-params';
import { areThresholdsMissing } from '../../../lib/moe-rows';
import { useMarksUrlState } from '../use-marks-url-state';

export const useMoeFeed = () => {
  const filters = useVehicleFilters();
  const [{ sort, order, q, pinned }] = useMarksUrlState();

  const query = useInfiniteQuery({ ...marksQueries.feed(moeFeedParams({ vehicle: filters.query, sort, order })), placeholderData: keepPreviousData });

  const all = query.data?.pages.flatMap(({ items }) => items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const isCollecting = areThresholdsMissing({ rows: all, sort, isComplete: !query.hasNextPage });
  const isUnfiltered = !filters.isActive && q.trim() === '';

  return {
    query,
    all,
    total,
    q,
    pinned,
    isCollecting,
    isUntracked: isCollecting || (query.data !== undefined && total === 0 && isUnfiltered)
  };
};
