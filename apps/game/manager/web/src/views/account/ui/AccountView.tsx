import { useTranslations } from 'use-intl';

import { HelpTip, PageHeader } from '@/ui-kit';
import { SiteSyncCard } from '@/widgets/site-sync-card';

import s from './AccountView.module.scss';

export const AccountView = () => {
  const t = useTranslations();

  return (
    <>
      <PageHeader
        description={t('account.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.account')}</HelpTip>}
        title={t('account.title')}
      />
      <div className={s.body}>
        <SiteSyncCard />
      </div>
    </>
  );
};
