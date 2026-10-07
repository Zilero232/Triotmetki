import { PackagePlus } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { ImportProfileForm } from '@/features/profile/import-profile';
import { SaveProfileForm } from '@/features/profile/save-profile';
import { Button, Card, HelpTip, Notice, PageColumns, PageHeader } from '@/ui-kit';
import { ProfileList } from '@/widgets/profile-list';

import { useProfilesView } from '../model/hooks';

import s from './ProfilesView.module.scss';

export const ProfilesView = () => {
  const t = useTranslations();
  const { clientPath, initialCode, isDisabled, components, pendingSets, presets, onStartFromPreset } = useProfilesView();

  return (
    <>
      <PageHeader
        description={t('profiles.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.profiles')}</HelpTip>}
        title={t('profiles.title')}
      />
      {pendingSets > 0 && (
        <Notice title={t('profiles.pendingSetsTitle', { count: pendingSets })} tone='warning'>
          {t('profiles.pendingSetsHint')}
        </Notice>
      )}
      <PageColumns
        aside={
          <>
            <Card description={t('profiles.saveDescription')} title={t('profiles.saveTitle')}>
              <SaveProfileForm clientPath={clientPath} components={components} disabled={isDisabled} />
            </Card>
            {presets.length > 0 && (
              <Card description={t('profiles.presetsDescription')} title={t('profiles.presetsTitle')}>
                <div className={s.presets}>
                  {presets.map((preset) => (
                    <Button key={preset.id} disabled={isDisabled} variant='secondary' onClick={() => onStartFromPreset(preset.id)}>
                      <PackagePlus aria-hidden />
                      {preset.title}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
            <Card description={t('profiles.importDescription')} title={t('profiles.importTitle')}>
              <ImportProfileForm clientPath={clientPath} disabled={isDisabled} initialCode={initialCode} />
            </Card>
          </>
        }
      >
        <ProfileList />
      </PageColumns>
    </>
  );
};
