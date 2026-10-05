import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { PROGRESSION_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class ProgressionSchedulesService extends createJobSchedules({
  schedules: PROGRESSION_SCHEDULES,
  label: 'progression'
}) {}
