'use client';

import { useQuery } from '@tanstack/react-query';

import { TANK_DETAIL } from '@/entities/tank/tank';

import { buildQueries } from '../../../api';

export const useBuildData = (slug: string) => {
  const tankQuery = useQuery(buildQueries.tank({ idOrSlug: slug, period: TANK_DETAIL.period }));
  const vehicle = tankQuery.data?.vehicle;
  const optionsQuery = useQuery({ ...buildQueries.options(vehicle?.tankId ?? 0), enabled: vehicle !== undefined });

  const { isError: isTankError, isFetching: isTankFetching } = tankQuery;
  const { data: options, isError: isOptionsError, isFetching: isOptionsFetching } = optionsQuery;
  const { error, refetch } = isTankError ? tankQuery : optionsQuery;

  return {
    data: vehicle && options ? { vehicle, options } : undefined,
    isError: isTankError || isOptionsError,
    error,
    isRefetching: isTankFetching || isOptionsFetching,
    refetch
  };
};
