'use client';

import { useFormatter, useTranslations } from 'next-intl';

import type { StatsTrendKey } from '../../../lib/stats-view';
import type { StatsTile, UseStatsTilesInput } from './use-stats-tiles.types';

import { STATS_TILES } from '../../../config';
import { ratingValueTone, trendDelta, winRateTone } from '../../../lib/stats-view';

export const useStatsTiles = ({ stats, reference, trends }: UseStatsTilesInput): StatsTile[] => {
  const t = useTranslations('profile.stats');
  const format = useFormatter();

  const change = (key: StatsTrendKey) => {
    const delta = trendDelta({ key, stats, reference });
    const digits = STATS_TILES.deltaDigits[key];

    return {
      delta,
      deltaLabel:
        delta === undefined
          ? undefined
          : format.number(delta, { signDisplay: 'exceptZero', minimumFractionDigits: digits, maximumFractionDigits: digits }),
      trend: trends?.[key]
    };
  };

  return [
    { key: 'battles', label: t('battles'), format: STATS_TILES.integer, tone: 'steel', value: stats.battles },
    {
      key: 'winRate',
      label: t('winRate'),
      format: STATS_TILES.decimals2,
      suffix: '%',
      tone: winRateTone(stats.winRate),
      value: stats.winRate,
      ...change('winRate')
    },
    { key: 'avgDamage', label: t('avgDamage'), format: STATS_TILES.integer, value: stats.avgDamage, ...change('avgDamage') },
    { key: 'wn8', label: 'WN8', format: STATS_TILES.integer, tone: ratingValueTone(stats.wn8), value: stats.wn8.value, ...change('wn8') },
    { key: 'eff', label: 'EFF', format: STATS_TILES.integer, tone: ratingValueTone(stats.eff), value: stats.eff.value },
    { key: 'avgFrags', label: t('avgFrags'), format: STATS_TILES.decimals2, tone: 'steel', value: stats.avgFrags },
    { key: 'survival', label: t('survival'), format: STATS_TILES.decimals1, suffix: '%', tone: 'steel', value: stats.survivalRate },
    { key: 'accuracy', label: t('accuracy'), format: STATS_TILES.decimals1, suffix: '%', tone: 'steel', value: stats.accuracy }
  ];
};
