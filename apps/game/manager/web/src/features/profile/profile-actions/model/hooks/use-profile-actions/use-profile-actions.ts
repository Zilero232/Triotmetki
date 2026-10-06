import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { useInstallation } from '@/entities/installation';
import { activateProfile, deleteProfile, needsInstall, PROFILE, renameProfile } from '@/entities/profile';
import { useNameForm, useNavigation } from '@/shared/lib';

import type { UseProfileActionsInput } from './use-profile-actions.types';

import { enabledComponents } from '../../../lib';
import { useCopyProfileCode } from '../use-copy-profile-code';
import { useProfileWrite } from '../use-profile-write';

export const useProfileActions = ({ clientPath, profile }: UseProfileActionsInput) => {
  const t = useTranslations('profiles');
  const { navigate } = useNavigation();
  const { data: installation } = useInstallation(clientPath);
  const [renameOpen, setRenameOpen] = useState(false);
  const target = { clientPath, id: profile.id };
  const renameForm = useNameForm({ name: profile.name, maxLength: PROFILE.nameMaxLength, message: t('validation.name') });
  const activate = useProfileWrite({ clientPath, write: () => activateProfile(target), onWritten: () => toast.success(t('activated')) });
  const remove = useProfileWrite({ clientPath, write: () => deleteProfile(target), onWritten: () => toast.success(t('deleted')) });
  const rename = useProfileWrite({
    clientPath,
    write: (name: string) => renameProfile({ ...target, name }),
    onWritten: () => {
      setRenameOpen(false);
      toast.success(t('renamed'));
    }
  });

  const copyCode = useCopyProfileCode(target);

  const isInstallNeeded = needsInstall({ installed: profile.installed, enabled: enabledComponents(installation) });

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
