'use client';

import { MarkOfExcellenceIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { RatingsMethodLink } from '@/entities/player/stats';
import { PageHero } from '@/ui-kit';

import type { MarksHeadProps } from './MarksHead.types';

import { MarksHeadFigures } from '../MarksHeadFigures';

export const MarksHead = ({ figures }: MarksHeadProps) => {
  const t = useTranslations('marks.head');

  return (
    <PageHero
      actions={<RatingsMethodLink section='marks' />}
      art={{ kind: 'emblem', glyph: <MarkOfExcellenceIcon marks={3} size={480} /> }}
      breadcrumbs={[{ label: t('title') }]}
      figures={<Suspense fallback={<MarksHeadFigures stats={null} />}>{figures}</Suspense>}
      lead={t('leadPlain')}
      title={t('title')}
    />
  );
};
