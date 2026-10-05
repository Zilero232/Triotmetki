import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { WATCHLIST_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class WatchlistSchedulesService extends createJobSchedules({
  schedules: WATCHLIST_SCHEDULES,
  label: 'watchlist'
}) {}
