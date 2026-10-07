import { useTranslations } from 'use-intl';

import { useNavigation } from '@/shared/lib';
import { HelpTip, PageHeader } from '@/ui-kit';
import { InstallWizard } from '@/widgets/install-wizard';

import { useInstallView } from '../model/hooks';

export const InstallView = () => {
  const t = useTranslations();
  const { params, visit } = useNavigation();
  const { isChange } = useInstallView();

  return (
    <>
      <PageHeader
        description={isChange ? t('install.changeDescription') : t('install.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.install')}</HelpTip>}
        title={isChange ? t('install.changeTitle') : t('install.title')}
      />
      <InstallWizard
        key={visit}
        initialComponents={params.components ?? null}
        initialPreset={params.preset ?? null}
        profileId={params.profileId ?? null}
        startAtReview={params.review ?? false}
      />
    </>
  );
};
