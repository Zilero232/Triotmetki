'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader } from '@/ui-kit';

import { ComparePicker, CompareResult } from './components';

import s from './StreamersSettingsComparePage.module.scss';

export const StreamersSettingsComparePage = () => {
  const t = useTranslations('streamerSettings.compare');
  const tNav = useTranslations('nav.items');

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: tNav('streamers'), href: ROUTES.streamers.list },
          { label: t('crumb'), href: ROUTES.streamers.settings.table },
          { label: t('title') }
        ]}
        description={t('description')}
        title={t('title')}
      />
      <ComparePicker />
      <CompareResult />
    </div>
  );
};
