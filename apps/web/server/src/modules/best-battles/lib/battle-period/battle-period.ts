import { subDays } from 'date-fns';

import type { BattlePeriodInput } from './battle-period.types';

import { BEST_BATTLES } from '../../config/feed.constants';

export const periodSince = ({ period, now }: BattlePeriodInput): Date => subDays(now, BEST_BATTLES.periodDays[period]);
