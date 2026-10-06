import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { useDisplayFormat, useErrorToast } from '@/shared/lib';

import type { UseClearCacheMutationInput } from './use-clear-cache-mutation.types';

import { clearCache } from '../../../api';

export const useClearCacheMutation = ({ onCleared }: UseClearCacheMutationInput) => {
  const t = useTranslations('settings.cache');
  const { megabytes } = useDisplayFormat();
  const showError = useErrorToast();

  return useMutation({
    mutationFn: clearCache,
    onSuccess: async (result) => {
      const size = megabytes(result.freedBytes);

      if (result.failed.length > 0) {
        toast.warning(t('partly', { size, count: result.failed.length }));
      } else {
        toast.success(t('cleared', { size }));
      }

      await onCleared();
    },
    onError: showError
  });
};
