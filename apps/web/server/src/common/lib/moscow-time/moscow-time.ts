import { tz } from '@date-fns/tz';
import { addDays, format, startOfDay, startOfISOWeek } from 'date-fns';

import type { WeekWindow } from './moscow-time.types';

import { TIME } from '../../../config';

export const moscowZone = tz(TIME.zone);

export const moscowDay = (date: Date): string => format(date, 'yyyy-MM-dd', { in: moscowZone });

export const moscowDayStart = (date: Date): Date => new Date(startOfDay(date, { in: moscowZone }).getTime());

export const moscowCalendarDate = (date: Date): Date => new Date(`${moscowDay(date)}T00:00:00.000Z`);

export const weekWindow = (date: Date): WeekWindow => {
  const start = startOfISOWeek(date, { in: moscowZone });

  return { start: new Date(start.getTime()), end: new Date(addDays(start, 7).getTime()), weekStart: moscowCalendarDate(start) };
};

export const previousWeek = (now: Date): WeekWindow => weekWindow(addDays(now, -7));
