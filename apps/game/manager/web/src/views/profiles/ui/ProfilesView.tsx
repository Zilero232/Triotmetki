import { useTranslations } from 'use-intl';

import { ImportProfileForm } from '@/features/profile/import-profile';
import { SaveProfileForm } from '@/features/profile/save-profile';
import { Card, HelpTip, PageHeader } from '@/ui-kit';
import { ProfileList } from '@/widgets/profile-list';

import { useProfilesView } from '../model/hooks';

export const ProfilesView = () => {
  const t = useTranslations();
  const { clientPath, initialCode, isDisabled } = useProfilesView();

  return (
    <>
      <PageHeader
        description={t('profiles.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.profiles')}</HelpTip>}
        title={t('profiles.title')}
      />
      <ProfileList />
      <Card title={t('profiles.saveTitle')}>
        <SaveProfileForm clientPath={clientPath} disabled={isDisabled} />
      </Card>
      <Card title={t('profiles.importTitle')}>
        <ImportProfileForm clientPath={clientPath} disabled={isDisabled} initialCode={initialCode} />
      </Card>
    </>
  );
};
