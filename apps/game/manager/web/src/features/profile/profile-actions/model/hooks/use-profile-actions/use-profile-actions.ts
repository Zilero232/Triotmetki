import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import type { ProfilesView } from '@/entities/profile';

import { useInstallation } from '@/entities/installation';
import { activateProfile, deleteProfile, exportProfile, needsInstall, PROFILE, renameProfile } from '@/entities/profile';
import { QUERY_KEYS } from '@/shared/config';
import { useErrorToast, useNameForm, useNavigation } from '@/shared/lib';

import type { UseProfileActionsInput } from './use-profile-actions.types';

export const useProfileActions = ({ clientPath, profile }: UseProfileActionsInput) => {
  const t = useTranslations('profiles');
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const { navigate } = useNavigation();
  const { data: installation } = useInstallation(clientPath);
  const [renameOpen, setRenameOpen] = useState(false);
  const target = { clientPath, id: profile.id };
  const renameForm = useNameForm({ name: profile.name, maxLength: PROFILE.nameMaxLength, message: t('validation.name') });
  const store = (view: ProfilesView) => queryClient.setQueryData(QUERY_KEYS.profiles(clientPath), view);

  const activate = useMutation({
    mutationFn: () => activateProfile(target),
    onSuccess: (view) => {
      store(view);
      toast.success(t('activated'));
    },
    onError: showError
  });

  const remove = useMutation({
    mutationFn: () => deleteProfile(target),
    onSuccess: (view) => {
      store(view);
      toast.success(t('deleted'));
    },
    onError: showError
  });

  const rename = useMutation({
    mutationFn: (name: string) => renameProfile({ ...target, name }),
    onSuccess: (view) => {
      store(view);
      setRenameOpen(false);
      toast.success(t('renamed'));
    },
    onError: showError
  });

  const copyCode = useMutation({
    mutationFn: async () => navigator.clipboard.writeText(await exportProfile(target)),
    onSuccess: () => toast.success(t('copied')),
    onError: showError
  });

  const enabled = installation?.components.filter((component) => component.state === 'enabled').map((component) => component.id) ?? [];
  const isInstallNeeded = needsInstall({ installed: profile.installed, enabled });

  return {
    isInstallNeeded,
    canApply: isInstallNeeded || !profile.active,
    isRenameOpen: renameOpen,
    setRenameOpen,
    renameField: renameForm.field,
    renameError: renameForm.error,
    isPending: activate.isPending || remove.isPending || rename.isPending || copyCode.isPending,
    onApply: () => {
      if (isInstallNeeded && profile.installed) {
        navigate({ page: 'install', params: { components: profile.installed, profileId: profile.id, review: true } });

        return;
      }

      activate.mutate();
    },
    onDelete: () => remove.mutate(),
    onCopyCode: () => copyCode.mutate(),
    onRename: renameForm.submitWith((name) => rename.mutate(name))
  };
};
