'use client';

import type { QueryFunctionContext } from '@tanstack/react-query';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';

import { compareTanks, getTank } from '@/entities/tank/tank';
import { QUERY_KEYS } from '@/shared/constants';

import { COMPARE_REQUEST } from '../../../config';
import { orderByIds } from '../../../lib/compare-ids';
import { useCompareIds } from '../use-compare-ids';

const { statsPeriod: period, mode, staleMs } = COMPARE_REQUEST;

export const useComparison = () => {
  const { ids } = useCompareIds();

  const {
    data: comparison,
    isPending,
    isPlaceholderData,
    isFetching,
    isError,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.compare.tanks(ids),
    queryFn: ({ signal }) => compareTanks({ tankIds: ids, signal }),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData
  });

  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: QUERY_KEYS.tanks.detail({ idOrSlug: String(id), period, mode }),
      queryFn: ({ signal }: QueryFunctionContext) => getTank({ idOrSlug: String(id), period, mode, signal }),
      staleTime: staleMs
    }))
  });

  const vehicles = orderByIds({ items: comparison?.vehicles ?? [], ids, idOf: ({ vehicle }) => vehicle.tankId });
  const statsOf = (tankId: number) => details[ids.indexOf(tankId)]?.data?.serverStats.find(({ cohort }) => cohort === 'all') ?? null;
  const isStatsLoading = details.some((detail) => detail.isPending);
  const detailOf = (tankId: number) => details[ids.indexOf(tankId)];
  const isStatsErrorOf = (tankId: number) => detailOf(tankId)?.isError ?? false;
  const retryStatsOf = (tankId: number) => void detailOf(tankId)?.refetch();

  const isLoading = isPending || (isPlaceholderData && vehicles.length === 0);

  return { ids, vehicles, statsOf, isStatsLoading, isStatsErrorOf, retryStatsOf, isLoading, isError, isFetching, refetch };
};
