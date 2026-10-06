import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { revealPath } from '@/entities/app-info';
import { useErrorToast } from '@/shared/lib';

import type { SendReportInput } from '../../../api';

import { saveReport } from '../../../api';
import { REPORT } from '../../../config';

export const useSaveReport = () => {
  const t = useTranslations('report');
  const showError = useErrorToast();

  return useMutation({
    mutationFn: (report: SendReportInput) => saveReport({ ...report, text: { filter: t('zipFilter'), fileName: REPORT.fileName } }),
    onSuccess: (path) => {
      if (!path) {
        return;
      }

      toast.success(t('saved'), { description: path, action: { label: t('reveal'), onClick: () => void revealPath(path).catch(showError) } });
    },
    onError: showError
  });
};
