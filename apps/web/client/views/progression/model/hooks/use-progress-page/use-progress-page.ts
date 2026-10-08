'use client';

import { usePlus } from '@/features/plus/plus-gate';

export const useProgressPage = () => {
  const { isPlus, isPending, isError, isRefetching, refetch } = usePlus();

  const isPlusKnown = !isPending && !isError;

  return {
    isFrozen: isPlusKnown && !isPlus,
    isPlusError: isError,
    isPlusRetrying: isRefetching,
    retryPlus: refetch
  };
};
