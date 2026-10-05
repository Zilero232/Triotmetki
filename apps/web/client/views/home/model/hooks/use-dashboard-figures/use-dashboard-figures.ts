'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { ratingValueTone, winRateTone } from '@/entities/player/stats';
import { percentText } from '@/shared/lib';

import type { UseDashboardFiguresInput, WeeklyInput } from './use-dashboard-figures.types';

import { HOME } from '../../../config';

export const useDashboardFigures = ({ overall, week }: UseDashboardFiguresInput) => {
  const t = useTranslations('home.dashboard.figures');
  const format = useFormatter();

  const weekly = ({ value, text }: WeeklyInput) => (value === null || value === undefined ? undefined : t('week', { value: text(value) }));

  const integer = (value: number) => format.number(Math.round(value));

  return [
    {
      key: 'wn8',
      label: t('wn8'),
      value: overall.wn8.value,
      format: HOME.dashboard.integerFormat,
      tone: ratingValueTone(overall.wn8),
      hint: weekly({ value: week?.wn8.value, text: integer })
    },
    {
      key: 'winRate',
      label: t('winRate'),
      value: overall.winRate,
      format: HOME.dashboard.winRateFormat,
      suffix: '%',
      tone: winRateTone(overall.winRate),
      hint: weekly({ value: week?.winRate, text: (value) => percentText({ format, value, digits: HOME.dashboard.weekDigits }) })
    },
    {
      key: 'avgDamage',
      label: t('avgDamage'),
      value: overall.avgDamage,
      format: HOME.dashboard.integerFormat,
      tone: 'steel' as const,
      hint: weekly({ value: week?.avgDamage, text: integer })
    },
    { key: 'battles', label: t('battles'), value: overall.battles, tone: 'steel' as const, hint: weekly({ value: week?.battles, text: integer }) }
  ];
};
