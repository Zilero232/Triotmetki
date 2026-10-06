import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { QUERY_KEYS } from '@/shared/config';

import { getHangarLooksStatus } from '../../../api';

export const useHangarLooksNotice = () => {
  const t = useTranslations('components');
  const queryClient = useQueryClient();

  return async (clientPath: string | null) => {
    const status = await getHangarLooksStatus(clientPath).catch(() => null);

    if (status === null) {
      return;
    }

    queryClient.setQueryData(QUERY_KEYS.hangarLooks(clientPath), status);

    if (status.state === 'failed') {
      toast.warning(t('hangarLooks.failedToast'));
    }
  };
};
