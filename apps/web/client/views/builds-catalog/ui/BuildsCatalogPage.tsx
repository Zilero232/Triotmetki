'use client';

import { BUILD_USAGE } from '@otmetki/schemas';
import { Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHero } from '@/ui-kit';

import { CatalogControls, CatalogTable } from './components';

import s from './BuildsCatalogPage.module.scss';

export const BuildsCatalogPage = () => {
  const t = useTranslations('buildsCatalog');

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <Wrench size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <div className={s.content}>
        <CatalogControls />
        <CatalogTable />
        <p className={s.source}>{t('source', { min: BUILD_USAGE.minSample })}</p>
      </div>
    </div>
  );
};
