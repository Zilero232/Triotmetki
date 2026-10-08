'use client';

import { Network } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHero } from '@/ui-kit';

import { NationSelector, TreeExplorer } from './components';

import s from './TreePage.module.scss';

export const TreePage = () => {
  const t = useTranslations('tree.head');

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <Network size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('title') }]}
        lead={t('description')}
        title={t('title')}
      />
      <div className={s.content}>
        <NationSelector />
        <TreeExplorer />
      </div>
    </div>
  );
};
