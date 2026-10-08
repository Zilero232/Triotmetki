'use client';

import { useServiceHealth } from '@/entities/reference/service-health';

export const useStatusPage = () => {
  const { query, summary } = useServiceHealth();

  const collector = query.data?.collector ?? null;

  return {
    summary,
    collector,
    isCollectorError: query.isError && collector === null,
    build: query.data?.build ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    checkedAt: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
    onRefresh: () => void query.refetch()
  };
};
