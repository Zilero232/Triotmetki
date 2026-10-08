'use client';

import { MOE, projectMoeBattles, toMoeThresholds } from '@otmetki/ratings';
import { useQuery } from '@tanstack/react-query';

import { getMoeHistory } from '@/entities/player/marks';
import { QUERY_KEYS } from '@/shared/constants';

import type { UseMoeProjectionInput } from './use-moe-projection.types';

import { MOE_TARGETS } from '../../../config';

export const useMoeProjection = ({ vehicle, percent, damage, target }: UseMoeProjectionInput) => {
  const tankId = vehicle?.tankId ?? 0;

  const {
    data: threshold = null,
    isFetching,
    isError,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.marks.history(tankId),
    queryFn: ({ signal }) => getMoeHistory({ tankId, signal }),
    enabled: vehicle !== null,
    select: (history) => history.at(-1) ?? null
  });

  const marks = MOE_TARGETS.find(({ value }) => value === target)?.marks ?? MOE_TARGETS.length;
  const targetPercent = MOE.markPercents[marks - 1] ?? MOE.maxPercent;

  const projection =
    threshold && damage > 0
      ? projectMoeBattles({ currentPercent: percent, targetPercent, averageCombinedDamage: damage, thresholds: toMoeThresholds(threshold) })
      : null;

  return {
    hasVehicle: vehicle !== null,
    isFetching,
    isError: isError && threshold === null,
    projection,
    targetPercent,
    retry: () => void refetch()
  };
};
