import { useT } from '@/entities/window/window-state';
import { Confirm, Empty, List } from '@/ui-kit';

import type { ProfilesProps } from './Profiles.types';

import { PROFILES } from '../config';
import { useProfiles } from '../model/hooks';
import { InlineForm, ProfileRow } from './components';

import s from './Profiles.module.scss';

export const Profiles = ({ profiles }: ProfilesProps) => {
  const t = useT();
  const model = useProfiles(profiles);

  return (
    <div className={s.profiles}>
      <InlineForm
        accent
        label={t('profileName')}
        maxLength={PROFILES.nameMaxLength}
        placeholder={t('profileName')}
        submitLabel={t('profileSaveNew')}
        value={model.name}
        onKey={model.onNameKey}
        onSubmit={model.saveNew}
        onValue={model.setName}
      />
      <InlineForm
        label={t('profileImport')}
        placeholder={t('profileImportPlaceholder')}
        submitLabel={t('profileImport')}
        value={model.importCode}
        onKey={model.onImportKey}
        onSubmit={model.importProfile}
        onValue={model.setImportCode}
      />
      {model.rows.length === 0 ? (
        <Empty>{t('profilesEmpty')}</Empty>
      ) : (
        <List label={t('sectionProfiles')}>
          {model.rows.map((row) => (
            <ProfileRow key={row.profile.id} row={row} />
          ))}
        </List>
      )}
      {model.deleting && (
        <Confirm
          cancelLabel={t('cancel')}
          confirmLabel={t('confirm')}
          text={t('profileDeleteConfirm')}
          onCancel={model.cancelDelete}
          onConfirm={model.confirmDelete}
        />
      )}
    </div>
  );
};
