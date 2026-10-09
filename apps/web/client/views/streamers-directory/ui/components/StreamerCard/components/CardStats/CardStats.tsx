'use client';

import { useFormatter, useTranslations } from 'next-intl';

import type { CardStatsProps } from './CardStats.types';

import { DIRECTORY } from '../../../../../config';

import s from './CardStats.module.scss';

export const CardStats = ({ stats, marks3 }: CardStatsProps) => {
  const t = useTranslations('streamersDirectory.card');
  const format = useFormatter();

  if (!stats) {
    return <p className={s.hidden}>{t('noStats')}</p>;
  }

  return (
    <dl className={s.root}>
      <div className={s.cell}>
        <dt>{t('wn8')}</dt>
        <dd className={s.value} data-tone={stats.wn8Tone ?? undefined}>
          {stats.wn8 === null ? '—' : format.number(Math.round(stats.wn8))}
        </dd>
      </div>
      <div className={s.cell}>
        <dt>{t('winRate')}</dt>
        <dd className={s.value} data-tone={stats.winRateTone ?? undefined}>
          {stats.winRate === null ? '—' : format.number(stats.winRate / 100, DIRECTORY.percentFormat)}
        </dd>
      </div>
      <div className={s.cell}>
        <dt>{t('battles')}</dt>
        <dd className={s.value}>{format.number(stats.battles)}</dd>
      </div>
      <div className={s.cell}>
        <dt>{t('marks3')}</dt>
        <dd className={s.value}>{marks3 === null ? '—' : format.number(marks3)}</dd>
      </div>
    </dl>
  );
};
