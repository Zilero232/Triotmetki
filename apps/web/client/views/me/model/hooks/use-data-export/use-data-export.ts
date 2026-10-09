'use client';

import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { usePlus } from '@/features/plus/plus-gate';
import { downloadFile } from '@/shared/lib/data-file';

import type { DataExportKind } from '../../../lib/data-export';

import { getAnalyticsExport, getRawStatsExport } from '../../../api';
import { exportFile, isRawExport } from '../../../lib/data-export';

export const useDataExport = () => {
  const t = useTranslations('me.export');
  const { isPlus } = usePlus();
  const mutation = useMutation({
    mutationFn: async (kind: DataExportKind) => {
      const date = format(new Date(), 'yyyy-MM-dd');
      const file = isRawExport(kind)
        ? exportFile({ kind, data: await getRawStatsExport(), date })
        : exportFile({ kind, data: await getAnalyticsExport(), date });

      downloadFile(file);
    },
    onError: () => toast.error(t('failed'))
  });

  return {
    isPlus,
    pendingKind: mutation.isPending ? mutation.variables : null,
    onExport: (kind: DataExportKind) => mutation.mutate(kind)
  };
};
