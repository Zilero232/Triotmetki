import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

import type { SetsView } from '@/entities/component-set';

import { COMPONENT_SET, exportSetsLibrary, importSet, importSetFile } from '@/entities/component-set';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

export const useImportSetForm = () => {
  const t = useTranslations('sets');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const schema = z.object({
    code: z.string().trim().startsWith(COMPONENT_SET.codePrefix, t('validation.code')).max(COMPONENT_SET.codeMaxLength, t('validation.code')),
    name: z.string().trim().max(COMPONENT_SET.nameMaxLength, t('validation.name'))
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { code: '', name: '' } });
  const store = (view: SetsView) => queryClient.setQueryData(QUERY_KEYS.sets, view);

  const fromCode = useMutation({
    mutationFn: ({ code, name }: z.infer<typeof schema>) => importSet({ code, name: name || null }),
    onSuccess: (view) => {
      store(view);
      form.reset({ code: '', name: '' });
      toast.success(t('imported'));
    },
    onError: showError
  });

  const fromFile = useMutation({
    mutationFn: () => importSetFile({ filter: t('fileFilter') }),
    onSuccess: (view) => {
      if (view) {
        store(view);
        toast.success(t('imported'));
      }
    },
    onError: showError
  });

  const exportAll = useMutation({
    mutationFn: () => exportSetsLibrary({ filter: t('libraryFilter'), fileName: t('libraryFileName') }),
    onSuccess: (path) => {
      if (path) {
        toast.success(t('exported'));
      }
    },
    onError: showError
  });

  return {
    register: form.register,
    errors: { code: form.formState.errors.code?.message, name: form.formState.errors.name?.message },
    isPending: fromCode.isPending,
    isFilePending: fromFile.isPending,
    isExportPending: exportAll.isPending,
    onSubmit: form.handleSubmit((values) => fromCode.mutate(values)),
    onImportFile: () => fromFile.mutate(),
    onExportAll: () => exportAll.mutate()
  };
};
