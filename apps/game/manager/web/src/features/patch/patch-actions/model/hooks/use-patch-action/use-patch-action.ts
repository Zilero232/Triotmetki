import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { match } from 'ts-pattern';
import { useTranslations } from 'use-intl';

import { useGamefaceNotice } from '@/entities/gameface';
import { useHangarLooksNotice } from '@/entities/hangar-looks';
import { checkNow, migrateModpack, updateModpack } from '@/entities/patch-report';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

import type { PatchActionRunner, UsePatchActionInput } from './use-patch-action.types';

export const usePatchAction = ({ kind, clientPath }: UsePatchActionInput) => {
  const t = useTranslations('patch');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const notifyGameface = useGamefaceNotice();
  const notifyHangarLooks = useHangarLooksNotice();
  const run: PatchActionRunner = match(kind)
    .with('check', () => () => checkNow())
    .with('migrate', () => migrateModpack)
    .with('update', () => updateModpack)
    .exhaustive();

  const mutation = useMutation({
    mutationFn: () => run(clientPath),
    onSuccess: async (report) => {
      queryClient.setQueryData(QUERY_KEYS.patchReport, report);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(clientPath) });

      if (kind !== 'check') {
        toast.success(t(kind === 'update' ? 'updatedToast' : 'migratedToast'));
        await notifyGameface(clientPath);
        await notifyHangarLooks(clientPath);
      }
    },
    onError: showError
  });

  return { isPending: mutation.isPending, run: () => mutation.mutate() };
};
