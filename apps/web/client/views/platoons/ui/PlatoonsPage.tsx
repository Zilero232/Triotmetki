'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader } from '@/ui-kit';

import { CreatePlatoonDialog, PlatoonBoard, PlatoonFilters } from './components';

import s from './PlatoonsPage.module.scss';

export const PlatoonsPage = () => {
  const t = useTranslations('platoons.head');
  const tCommon = useTranslations('common');

  return (
    <div className={s.root}>
      <PageHeader
        actions={<CreatePlatoonDialog />}
        breadcrumbs={[{ label: tCommon('home'), href: ROUTES.home }, { label: t('title') }]}
        description={t('description')}
        title={t('title')}
      />
      <PlatoonFilters />
      <PlatoonBoard />
    </div>
  );
};
