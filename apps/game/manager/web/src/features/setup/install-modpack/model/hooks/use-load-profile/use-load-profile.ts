import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { useErrorToast } from '@/shared/lib';

import type { UseLoadProfileInput } from './use-load-profile.types';

import { readInstallerProfile } from '../../../api';
import { closeDependencies } from '../../../lib';

export const useLoadProfile = ({ components, onLoaded }: UseLoadProfileInput) => {
  const t = useTranslations('install');
  const showError = useErrorToast();

  return useMutation({
    mutationFn: () => readInstallerProfile({ filter: t('profileFilter') }),
    onSuccess: (ids) => {
      if (!ids) {
        return;
      }

      onLoaded(closeDependencies({ components, ids }));
      toast.success(t('profileLoaded'));
    },
    onError: showError
  });
};
