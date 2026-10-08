'use client';

import { MasteryIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { PageHero } from '@/ui-kit';

import type { TopPageProps } from './TopPage.types';

import s from './TopPage.module.scss';

export const TopPage = ({ children }: TopPageProps) => {
  const t = useTranslations('top');

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <MasteryIcon level='master' size={480} /> }}
        breadcrumbs={[{ label: t('title') }]}
        lead={t('description')}
        title={t('title')}
      />
      {children}
    </div>
  );
};
