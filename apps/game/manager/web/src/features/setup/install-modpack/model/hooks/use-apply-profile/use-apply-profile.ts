import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { activateProfile } from '@/entities/profile';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

export const useApplyProfile = (clientPath: string | null) => {
  const t = useTranslations('install');
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation({
    mutationFn: (id: string) => activateProfile({ clientPath, id }),
    onSuccess: (profiles) => {
      queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), profiles);
      toast.success(t('profileApplied'));
    },
    onError: showError
  });
};
