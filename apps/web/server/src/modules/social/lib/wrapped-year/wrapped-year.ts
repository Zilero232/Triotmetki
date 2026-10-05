import { tz, TZDate } from '@date-fns/tz';
import { getMonth, getYear } from 'date-fns';

import type { YearWindow } from './wrapped-year.types';

import { TIME } from '../../../../config';

const moscowZone = tz(TIME.zone);

export const wrappedYearWindow = (year: number): YearWindow => ({
  start: new Date(new TZDate(year, 0, 1, TIME.zone).getTime()),
  end: new Date(new TZDate(year + 1, 0, 1, TIME.zone).getTime())
});

export const moscowYear = (date: Date): number => getYear(date, { in: moscowZone });

export const moscowMonth = (date: Date): number => getMonth(date, { in: moscowZone }) + 1;
