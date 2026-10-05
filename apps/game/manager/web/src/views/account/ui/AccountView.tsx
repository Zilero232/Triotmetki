import { useTranslations } from 'use-intl';

import { HelpTip, PageHeader } from '@/ui-kit';
import { SectionTabs } from '@/widgets/section-tabs';
import { SiteSyncCard } from '@/widgets/site-sync-card';

export const AccountView = () => {
  const t = useTranslations();

  return (
    <>
      <SectionTabs section='settings' />
      <PageHeader
        description={t('account.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.account')}</HelpTip>}
        title={t('account.title')}
      />
      <SiteSyncCard />
    </>
  );
};
