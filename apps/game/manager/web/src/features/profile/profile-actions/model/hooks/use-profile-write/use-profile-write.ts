import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

import type { UseProfileWriteInput } from './use-profile-write.types';

export const useProfileWrite = <TVariables = void>({ clientPath, write, onWritten }: UseProfileWriteInput<TVariables>) => {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation({
    mutationFn: write,
    onSuccess: (view) => {
      queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), view);
      onWritten();
    },
    onError: showError
  });
};
