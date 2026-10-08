'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/ui-kit';

import { ReplayBrowser, ReplayUpload } from './components';

import s from './ReplaysPage.module.scss';

export const ReplaysPage = () => {
  const t = useTranslations('replays.head');

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('title') }]} description={t('description')} title={t('title')} />
      <div className={s.layout}>
        <ReplayBrowser />
        <ReplayUpload />
      </div>
    </div>
  );
};
