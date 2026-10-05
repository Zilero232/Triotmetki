import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { MAP_STATS_SCHEDULES } from '../config/map-stats.constants';

@Injectable()
export class MapStatsSchedulesService extends createJobSchedules({
  schedules: MAP_STATS_SCHEDULES,
  label: 'map-stats'
}) {}
