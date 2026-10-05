import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { PROFILE, saveProfile } from '@/entities/profile';
import { QUERY_KEYS } from '@/shared/config';
import { useSaveNameForm } from '@/shared/lib';

import type { UseSaveProfileFormInput } from './use-save-profile-form.types';

export const useSaveProfileForm = ({ clientPath, components }: UseSaveProfileFormInput) => {
  const t = useTranslations('profiles');
  const queryClient = useQueryClient();

  return useSaveNameForm({
    maxLength: PROFILE.nameMaxLength,
    message: t('validation.name'),
    save: (name) => saveProfile({ clientPath, name, components }),
    onSaved: (view) => {
      queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), view);
      toast.success(t('saved'));
    }
  });
};
