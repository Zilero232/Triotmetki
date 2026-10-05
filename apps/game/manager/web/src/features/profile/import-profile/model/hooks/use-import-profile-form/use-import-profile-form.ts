import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

import { importProfile, importProfileFile, PROFILE } from '@/entities/profile';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast } from '@/shared/lib';

import type { UseImportProfileFormInput } from './use-import-profile-form.types';

export const useImportProfileForm = ({ clientPath, initialCode }: UseImportProfileFormInput) => {
  const t = useTranslations('profiles');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const schema = z.object({
    code: z
      .string()
      .trim()
      .max(PROFILE.codeMaxLength, t('validation.code'))
      .refine((code) => PROFILE.codePrefixes.some((prefix) => code.startsWith(prefix)), t('validation.code')),
    name: z.string().trim().max(PROFILE.nameMaxLength, t('validation.name'))
  });

  const form = useForm({ resolver: zodResolver(schema), values: { code: initialCode, name: '' } });

  const mutation = useMutation({
    mutationFn: ({ code, name }: z.infer<typeof schema>) => importProfile({ clientPath, code, name: name || null }),
    onSuccess: (view) => {
      queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), view);
      form.reset({ code: '', name: '' });
      toast.success(t('imported'));
    },
    onError: showError
  });

  const fromFile = useMutation({
    mutationFn: () => importProfileFile({ clientPath, text: { filter: t('fileFilter') } }),
    onSuccess: (view) => {
      if (view) {
        queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), view);
        toast.success(t('imported'));
      }
    },
    onError: showError
  });

  return {
    register: form.register,
    errors: { code: form.formState.errors.code?.message, name: form.formState.errors.name?.message },
    isPending: mutation.isPending,
    isFilePending: fromFile.isPending,
    onSubmit: form.handleSubmit((values) => mutation.mutate(values)),
    onImportFile: () => fromFile.mutate()
  };
};
