import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { COMPETITION_SCHEDULES } from '../config/competitions.constants';

@Injectable()
export class CompetitionsSchedulesService extends createJobSchedules({
  schedules: COMPETITION_SCHEDULES,
  label: 'competitions'
}) {}
