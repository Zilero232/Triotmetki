'use client';

import { GitCompareArrows } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, PageHeader } from '@/ui-kit';
import { StreamersHubNav } from '@/widgets/streamer/streamers-hub';

import { STREAMERS_SETTINGS_PAGE } from '../config';
import { MySettingsShare, SettingsTable, TopSettings } from './components';

import s from './StreamersSettingsPage.module.scss';

export const StreamersSettingsPage = () => {
  const t = useTranslations('streamerSettings.list');

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.streamers.settings.compare}>
            <GitCompareArrows size={STREAMERS_SETTINGS_PAGE.iconSize} />
            {t('compare')}
          </Link>
        }
        breadcrumbs={[{ label: t('crumb'), href: ROUTES.streamers.list }, { label: t('title') }]}
        description={t('description')}
        title={t('title')}
      />
      <StreamersHubNav />
      <SettingsTable />
      <TopSettings />
      <MySettingsShare />
    </div>
  );
};
