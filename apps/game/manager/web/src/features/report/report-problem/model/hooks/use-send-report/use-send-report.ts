import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { useErrorToast } from '@/shared/lib';

import type { UseSendReportInput } from './use-send-report.types';

import { sendReport } from '../../../api';
import { REPORT } from '../../../config';

export const useSendReport = ({ onSent }: UseSendReportInput) => {
  const t = useTranslations('report');
  const showError = useErrorToast();

  return useMutation({
    mutationFn: sendReport,
    onSuccess: (receipt) => {
      toast.success(t('sent', { id: receipt.id.slice(0, REPORT.receiptPrefixLength) }), { description: t('sentHint') });
      onSent();
    },
    onError: showError
  });
};
