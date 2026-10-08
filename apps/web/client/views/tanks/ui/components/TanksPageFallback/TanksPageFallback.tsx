'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHero, Skeleton } from '@/ui-kit';

import { TANKS_FALLBACK } from '../../../config';

import s from './TanksPageFallback.module.scss';

export const TanksPageFallback = () => {
  const t = useTranslations('tanks.head');
  const tSite = useTranslations('nav');

  return (
    <div aria-busy className={s.root}>
      <PageHero
        breadcrumbs={[{ label: tSite('groups.vehicles'), href: ROUTES.tanks.list }, { label: tSite('tanksHub.stats') }]}
        lead={t('description')}
        title={t('title')}
      />
      <div className={s.body}>
        <Skeleton height={TANKS_FALLBACK.navHeight} shape='block' />
        <Skeleton height={TANKS_FALLBACK.filtersHeight} shape='block' />
        <Skeleton height={TANKS_FALLBACK.tableHeight} shape='block' />
      </div>
    </div>
  );
};
