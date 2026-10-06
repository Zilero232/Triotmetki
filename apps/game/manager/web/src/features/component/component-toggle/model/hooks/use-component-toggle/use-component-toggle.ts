import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import type { Installation } from '@/entities/installation';

import { useHangarLooksNotice } from '@/entities/hangar-looks';
import { setComponentEnabled } from '@/entities/installation';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

import type { UseComponentToggleInput } from './use-component-toggle.types';

export const useComponentToggle = ({ clientPath, componentId, title, libraries }: UseComponentToggleInput) => {
  const t = useTranslations('components');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const notifyHangarLooks = useHangarLooksNotice();

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setComponentEnabled({ clientPath, componentId, enabled }),
    onSuccess: async (installation: Installation, enabled) => {
      queryClient.setQueryData(QUERY_KEYS.installation(clientPath), installation);

      toast.success(
        enabled && libraries.length > 0
          ? t('enabledWithLibrariesToast', { title, list: libraries.join(', ') })
          : t(enabled ? 'enabledToast' : 'disabledToast', { title })
      );

      await notifyHangarLooks(clientPath);
    },
    onError: showError
  });

  return { isPending: mutation.isPending, onCheckedChange: (enabled: boolean) => mutation.mutate(enabled) };
};
