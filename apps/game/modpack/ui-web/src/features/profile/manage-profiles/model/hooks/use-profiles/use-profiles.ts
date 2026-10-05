import { useState } from 'react';

import type { UiProfile, UiProfiles } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol';

import { useProfileRename } from '../use-profile-rename';
import { useSubmitField } from '../use-submit-field';

export const useProfiles = (profiles: UiProfiles) => {
  const nameField = useSubmitField((name) => send({ type: 'profile_save', name }));
  const importField = useSubmitField((code) => send({ type: 'profile_import', code }));
  const rename = useProfileRename();
  const [deleting, setDeleting] = useState<string | null>(null);

  const rowOf = (profile: UiProfile) => ({
    profile,
    active: profiles.active === profile.id,
    renameValue: rename.renameValue(profile),
    load: () => send({ type: 'profile_load', id: profile.id }),
    overwrite: () => send({ type: 'profile_save', name: profile.name, id: profile.id }),
    exportCode: () => send({ type: 'profile_export', id: profile.id }),
    askDelete: () => setDeleting(profile.id),
    startRename: () => rename.startRename(profile),
    editRename: rename.editRename,
    onRenameKey: rename.onRenameKey,
    commitRename: rename.commitRename,
    cancelRename: rename.cancelRename
  });

  return {
    name: nameField.value,
    setName: nameField.setValue,
    saveNew: nameField.submit,
    onNameKey: nameField.onKey,
    importCode: importField.value,
    setImportCode: importField.setValue,
    importProfile: importField.submit,
    onImportKey: importField.onKey,
    deleting: deleting !== null,
    confirmDelete: () => {
      if (deleting) {
        send({ type: 'profile_delete', id: deleting });
      }

      setDeleting(null);
    },
    cancelDelete: () => setDeleting(null),
    rows: profiles.items.map(rowOf)
  };
};
