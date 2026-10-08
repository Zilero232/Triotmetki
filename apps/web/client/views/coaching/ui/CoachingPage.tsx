'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/ui-kit';

import { CoachingOrders, CoachList, CoachProfileDialog } from './components';

import s from './CoachingPage.module.scss';

export const CoachingPage = () => {
  const t = useTranslations('coaching.head');

  return (
    <div className={s.root}>
      <PageHeader actions={<CoachProfileDialog />} breadcrumbs={[{ label: t('title') }]} description={t('description')} title={t('title')} />
      <div className={s.grid}>
        <CoachList />
        <CoachingOrders />
      </div>
    </div>
  );
};
