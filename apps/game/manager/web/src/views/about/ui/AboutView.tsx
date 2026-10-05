import { OtmetkiLogoIcon } from '@otmetki/icons';
import { useTranslations } from 'use-intl';

import { useAppInfo } from '@/entities/app-info';
import { AppUpdatePanel } from '@/features/app/app-update';
import { CollectLogsButton } from '@/features/app/collect-logs';
import { LINKS } from '@/shared/config';
import { Card, ExternalLink, PageHeader } from '@/ui-kit';
import { SectionTabs } from '@/widgets/section-tabs';
import { UsedLibraries } from '@/widgets/used-libraries';

import s from './AboutView.module.scss';

export const AboutView = () => {
  const t = useTranslations();
  const { data: info } = useAppInfo();

  return (
    <>
      <SectionTabs section='help' />
      <PageHeader title={t('about.title')} />
      <Card tone='accent'>
        <div className={s.brand}>
          <OtmetkiLogoIcon aria-hidden className={s.logo} size={40} />
          <div className={s.brandText}>
            <span className={s.name}>{t('common.appName')}</span>
            {info && <span className={s.version}>{t('about.version', { version: info.version })}</span>}
          </div>
        </div>
        <div className={s.links}>
          <ExternalLink href={LINKS.site}>{t('about.site')}</ExternalLink>
          <ExternalLink href={LINKS.modPage}>{t('about.modPage')}</ExternalLink>
        </div>
      </Card>
      <Card title={t('about.updateTitle')}>
        <AppUpdatePanel />
      </Card>
      <Card actions={<CollectLogsButton />} description={t('about.logsDescription')} title={t('about.logsTitle')} />
      {info && (
        <Card title={t('about.pathsTitle')}>
          <dl className={s.paths}>
            <dt>{t('about.stateRoot')}</dt>
            <dd>{info.stateRoot}</dd>
            <dt>{t('about.roamingRoot')}</dt>
            <dd>{info.roamingRoot}</dd>
          </dl>
        </Card>
      )}
      <UsedLibraries />
      <Card description={t('about.unsignedDescription')} title={t('about.unsignedTitle')} tone='warning' />
      <p className={s.legal}>{t('common.legal')}</p>
    </>
  );
};
