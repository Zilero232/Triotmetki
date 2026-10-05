import type { AnalyticsGranularity, AnalyticsPeriod } from '@otmetki/schemas';

import { subDays } from 'date-fns';

import type { PeriodStartInput } from './window.types';

import { ANALYTICS_WINDOW } from '../../config/window.constants';

export const periodStart = ({ period, now }: PeriodStartInput): Date | null => {
  const days = ANALYTICS_WINDOW.periodDays[period];

  return days === null ? null : subDays(now, days);
};

export const trendGranularity = (period: AnalyticsPeriod): AnalyticsGranularity => {
  const days = ANALYTICS_WINDOW.periodDays[period];

  return days !== null && days <= ANALYTICS_WINDOW.weekTrendMaxDays ? 'week' : 'month';
};
