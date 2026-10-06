import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useSelectedClient } from '@/entities/client';
import { QUERY_KEYS } from '@/shared/config';
import { toggledSet, useDisplayFormat, useErrorToast } from '@/shared/lib';

import type { CacheToggleInput } from './use-clear-cache.types';

import { scanCache } from '../../../api';
import { cacheRows, chosenTargets, totalBytes } from '../../../lib';
import { useClearCacheMutation } from '../use-clear-cache-mutation';

export const useClearCache = () => {
  const { megabytes } = useDisplayFormat();
  const showError = useErrorToast();
  const { clientPath } = useSelectedClient();
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(() => new Set());
  const planQuery = useQuery({ queryKey: QUERY_KEYS.cachePlan(clientPath), queryFn: () => scanCache(clientPath), enabled: false });

  const rescan = async () => {
    const { error } = await planQuery.refetch();

    if (error) {
      showError(error);
    }
  };

  const clear = useClearCacheMutation({ onCleared: rescan });
  const targets = planQuery.data?.targets ?? [];
  const chosen = chosenTargets({ targets, unchecked });

  return {
    isScanned: planQuery.data !== undefined,
    isScanning: planQuery.isFetching,
    isClearing: clear.isPending,
    rows: cacheRows({ targets, unchecked, sizeOf: megabytes }),
    chosenCount: chosen.length,
    chosenSize: megabytes(totalBytes(chosen)),
    canClear: clientPath !== null && chosen.length > 0,
    canScan: clientPath !== null,
    onScan: () => {
      setUnchecked(new Set());
      void rescan();
    },
    onToggle: ({ id, checked }: CacheToggleInput) => setUnchecked((current) => toggledSet({ set: current, item: id, isOn: !checked })),
    onClear: () => clear.mutate({ clientPath, ids: chosen.map((target) => target.id) })
  };
};
