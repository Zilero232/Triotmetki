import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { SUPERTEST_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class SupertestSchedulesService extends createJobSchedules({
  schedules: SUPERTEST_SCHEDULES,
  label: 'supertest'
}) {}
