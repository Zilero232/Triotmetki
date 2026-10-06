import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { useGamefaceNotice } from '@/entities/gameface';
import { useHangarLooksNotice } from '@/entities/hangar-looks';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorText, useErrorToast, useNavigation } from '@/shared/lib';

import type { InstallRequest } from '../../../api';
import type { UseInstallMutationInput } from './use-install-mutation.types';

import { installModpack } from '../../../api';
import { useApplyProfile } from '../use-apply-profile';

export const useInstallMutation = ({ clientPath, profileId }: UseInstallMutationInput) => {
  const t = useTranslations('install');
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const errorText = useErrorText();
  const notifyGameface = useGamefaceNotice();
  const notifyHangarLooks = useHangarLooksNotice();
  const applyProfile = useApplyProfile(clientPath);

  return useMutation({
    mutationFn: (request: InstallRequest) => installModpack(request),
    onSuccess: async ({ installation, warnings }) => {
      const enabledCount = installation.components.filter((component) => component.state === 'enabled').length;

      queryClient.setQueryData(QUERY_KEYS.installation(clientPath), installation);
      await queryClient.invalidateQueries();
      toast.success(t('installed'), { description: t('installedHint', { count: enabledCount }) });

      for (const warning of warnings) {
        toast.warning(t(`partial.${warning.step}`), { description: errorText({ code: warning.code, message: '' }).hint });
      }

      if (profileId) {
        await applyProfile.mutateAsync(profileId).catch(() => null);
      }

      navigate({ page: 'home' });
      await notifyGameface(clientPath);
      await notifyHangarLooks(clientPath);
    },
    onError: showError
  });
};
