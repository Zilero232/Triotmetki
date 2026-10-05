import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import type { SyncResolution } from '@/entities/site-sync';

import { useSelectedClient } from '@/entities/client';
import { syncNow } from '@/entities/site-sync';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

import type { SyncConflict } from '../../../lib';

import { syncBroughtChanges, syncConflicts } from '../../../lib';

export const useSyncNow = () => {
  const t = useTranslations('sync');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const { clientPath } = useSelectedClient();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const sync = useMutation({
    mutationFn: (resolution: SyncResolution | null) => syncNow({ clientPath, resolution }),
    onSuccess: async (report) => {
      const found = syncConflicts(report);

      setConflicts(found);

      if (found.length === 0) {
        toast.success(syncBroughtChanges(report) ? t('updated') : t('done'));
      }

      await Promise.all(
        [QUERY_KEYS.profiles(clientPath), QUERY_KEYS.syncStatus(clientPath)].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      );
    },
    onError: (error) => {
      setConflicts([]);
      showError(error);
    }
  });

  return {
    conflicts: conflicts.map((conflict) => ({
      ...conflict,
      text: t('conflictLine', { library: t(`libraries.${conflict.library}`), local: conflict.localChanges, remote: conflict.remoteChanges })
    })),
    isConflictOpen: conflicts.length > 0,
    isPending: sync.isPending,
    onSync: () => sync.mutate(null),
    onResolve: (resolution: SyncResolution) => sync.mutate(resolution),
    onConflictOpenChange: (open: boolean) => {
      if (!open) {
        setConflicts([]);
      }
    }
  };
};
