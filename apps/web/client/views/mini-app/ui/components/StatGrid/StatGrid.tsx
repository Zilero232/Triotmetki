'use client';

import { useTranslations } from 'next-intl';
import { range } from 'remeda';

import { ratingValueTone, winRateTone } from '@/entities/player/stats';
import { KeyFigure, Skeleton } from '@/ui-kit';

import type { StatGridProps } from './StatGrid.types';

import { STAT_GRID } from '../../../config';
import { roundedFigure } from '../../../lib/rounded-figure';

import s from './StatGrid.module.scss';

export const StatGrid = ({ stats }: StatGridProps) => {
  const t = useTranslations('tg.stats');
  const tCommon = useTranslations('common');

  if (!stats) {
    return (
      <div aria-busy className={s.root}>
        {range(0, STAT_GRID.skeletonTiles).map((index) => (
          <Skeleton key={index} height={72} shape='block' />
        ))}
      </div>
    );
  }

  return (
    <div className={s.root}>
      <KeyFigure isFramed label={tCommon('ratings.wn8')} tone={ratingValueTone(stats.wn8)} value={roundedFigure(stats.wn8.value)} />
      <KeyFigure isFramed format={STAT_GRID.winRateFormat} label={t('winRate')} suffix='%' tone={winRateTone(stats.winRate)} value={stats.winRate} />
      <KeyFigure isFramed label={t('avgDamage')} value={roundedFigure(stats.avgDamage)} />
      <KeyFigure isFramed label={t('battles')} value={stats.battles} />
    </div>
  );
};
