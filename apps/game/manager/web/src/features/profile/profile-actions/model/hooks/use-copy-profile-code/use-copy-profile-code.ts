import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { exportProfile } from '@/entities/profile';
import { useErrorToast } from '@/shared/lib';

import type { UseCopyProfileCodeInput } from './use-copy-profile-code.types';

export const useCopyProfileCode = (target: UseCopyProfileCodeInput) => {
  const t = useTranslations('profiles');
  const showError = useErrorToast();

  return useMutation({
    mutationFn: async () => navigator.clipboard.writeText(await exportProfile(target)),
    onSuccess: () => toast.success(t('copied')),
    onError: showError
  });
};
