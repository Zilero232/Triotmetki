import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import type { SetsView } from '@/entities/component-set';

import { COMPONENT_SET, deleteSet, duplicateSet, exportSet, exportSetFile, renameSet, setFileName } from '@/entities/component-set';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast, useNameForm, useNavigation } from '@/shared/lib';

import type { NameDialog, UseSetActionsInput } from './use-set-actions.types';

export const useSetActions = ({ set }: UseSetActionsInput) => {
  const t = useTranslations('sets');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const { navigate } = useNavigation();
  const [dialog, setDialog] = useState<NameDialog>(null);
  const form = useNameForm({
    name: dialog === 'duplicate' ? t('copyName', { name: set.name }).slice(0, COMPONENT_SET.nameMaxLength) : set.name,
    maxLength: COMPONENT_SET.nameMaxLength,
    message: t('validation.name')
  });

  const store = (view: SetsView) => queryClient.setQueryData(QUERY_KEYS.sets, view);

  const rename = useMutation({
    mutationFn: (name: string) => (dialog === 'duplicate' ? duplicateSet({ id: set.id, name }) : renameSet({ id: set.id, name })),
    onSuccess: (view) => {
      store(view);
      toast.success(t(dialog === 'duplicate' ? 'duplicated' : 'renamed'));
      setDialog(null);
    },
    onError: showError
  });

  const remove = useMutation({
    mutationFn: () => deleteSet(set.id),
    onSuccess: (view) => {
      store(view);
      toast.success(t('deleted'));
    },
    onError: showError
  });

  const copyCode = useMutation({
    mutationFn: async () => navigator.clipboard.writeText(await exportSet(set.id)),
    onSuccess: () => toast.success(t('copied')),
    onError: showError
  });

  const exportFile = useMutation({
    mutationFn: () =>
      exportSetFile({
        id: set.id,
        text: { filter: t('fileFilter'), fileName: setFileName({ name: set.name, extension: COMPONENT_SET.fileExtension }) }
      }),
    onSuccess: (path) => {
      if (path) {
        toast.success(t('exported'));
      }
    },
    onError: showError
  });

  return {
    dialog,
    nameField: form.field,
    nameError: form.error,
    isPending: rename.isPending || remove.isPending || copyCode.isPending || exportFile.isPending,
    onApply: () => navigate({ page: 'install', params: { components: set.components } }),
    onOpenDialog: setDialog,
    onCloseDialog: () => setDialog(null),
    onDelete: () => remove.mutate(),
    onCopyCode: () => copyCode.mutate(),
    onExportFile: () => exportFile.mutate(),
    onSubmitName: form.submitWith((name) => rename.mutate(name))
  };
};
