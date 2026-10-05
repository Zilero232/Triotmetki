import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import type { ClientsView } from '@/entities/client';

import { addClient, selectClient, useSelectedClient } from '@/entities/client';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

export const useClientPicker = () => {
  const t = useTranslations('client');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const { clients, clientPath } = useSelectedClient();

  const applyView = async (view: ClientsView) => {
    queryClient.setQueryData(QUERY_KEYS.clients, view);
    await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== QUERY_KEYS.clients[0] });
  };

  const selectMutation = useMutation({ mutationFn: selectClient, onSuccess: applyView, onError: showError });

  const addMutation = useMutation({
    mutationFn: () => addClient({ title: t('addTitle') }),
    onSuccess: async (view) => {
      if (view) {
        await applyView(view);
        toast.success(t('added'));
      }
    },
    onError: showError
  });

  const options = clients.map((client) => ({
    value: client.path,
    label: `${client.version} · ${t(`branch.${client.branch}`)} · ${client.path}`,
    disabled: client.problem !== null
  }));

  return {
    options,
    clientPath,
    isPending: selectMutation.isPending || addMutation.isPending,
    onSelect: (path: string) => selectMutation.mutate(path),
    onAdd: () => addMutation.mutate()
  };
};
