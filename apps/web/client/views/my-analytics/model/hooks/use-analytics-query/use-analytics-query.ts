'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { usePlus } from '@/features/plus/plus-gate';

import type { AnalyticsQuery, UseAnalyticsQueryInput } from './use-analytics-query.types';

import { analyticsStatus, shouldRetryAnalytics } from '../../../lib/analytics-status';

export const useAnalyticsQuery = <T>({ queryKey, queryFn, requiresPlus }: UseAnalyticsQueryInput<T>): AnalyticsQuery<T> => {
  const plus = usePlus();
  const { data, isPending, error, isFetching, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled: !requiresPlus || plus.isPlus,
    placeholderData: keepPreviousData,
    retry: (failureCount, queryError) => shouldRetryAnalytics({ failureCount, error: queryError })
  });

  const isPlusFailed = requiresPlus && plus.isError;
  const status = analyticsStatus({
    requiresPlus,
    isPlus: plus.isPlus,
    isPlusPending: plus.isPending,
    isPlusError: plus.isError,
    isPending,
    error
  });

  const retry = () => {
    if (isPlusFailed) {
      plus.refetch();

      return;
    }

    void refetch();
  };

  return {
    data,
    status,
    isPlus: plus.isPlus,
    isRetrying: isFetching || plus.isRefetching,
    retry
  };
};
