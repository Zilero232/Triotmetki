'use client';

import { ErrorState, Skeleton } from '@/ui-kit';

import type { PlusGateProps } from './PlusGate.types';

import { PLUS_GATE } from '../../config';
import { usePlus } from '../../model/hooks';
import { PlusTeaser } from '../PlusTeaser';

export const PlusGate = ({ feature, children, fallback }: PlusGateProps) => {
  const { isPlus, isPending, isError, isRefetching, refetch } = usePlus();

  if (isPending) {
    return <Skeleton height={PLUS_GATE.skeletonHeight} shape='block' />;
  }

  if (isError) {
    return <ErrorState isRetrying={isRefetching} onRetry={refetch} />;
  }

  if (isPlus) {
    return children;
  }

  return fallback ?? <PlusTeaser feature={feature} />;
};
