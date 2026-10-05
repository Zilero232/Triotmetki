import { tz } from '@date-fns/tz';
import { addDays, addHours, startOfDay, subDays } from 'date-fns';

import type { DailyWindow } from './daily-reset.types';

import { TIME } from '../../../../config';
import { FIRST_WIN } from '../../config/playlist.constants';

const zone = tz(TIME.zone);

export const dailyWindow = (now: Date): DailyWindow => {
  const today = addHours(startOfDay(now, { in: zone }), FIRST_WIN.resetHour, { in: zone });
  const resetAt = today.getTime() > now.getTime() ? subDays(today, 1, { in: zone }) : today;

  return { resetAt: new Date(resetAt.getTime()), nextResetAt: new Date(addDays(resetAt, 1, { in: zone }).getTime()) };
};
