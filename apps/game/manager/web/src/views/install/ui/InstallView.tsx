import { useTranslations } from 'use-intl';

import { useNavigation } from '@/shared/lib';
import { HelpTip, PageHeader } from '@/ui-kit';
import { InstallWizard } from '@/widgets/install-wizard';

export const InstallView = () => {
  const t = useTranslations();
  const { params, visit } = useNavigation();

  return (
    <>
      <PageHeader
        description={t('install.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.install')}</HelpTip>}
        title={t('install.title')}
      />
      <InstallWizard
        key={visit}
        initialComponents={params.components ?? null}
        initialPreset={params.preset ?? null}
        startAtReview={params.review ?? false}
      />
    </>
  );
};
