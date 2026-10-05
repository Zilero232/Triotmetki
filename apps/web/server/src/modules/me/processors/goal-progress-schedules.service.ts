import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { GOAL_PROGRESS_SCHEDULES } from '../config/goal-progress.constants';

@Injectable()
export class GoalProgressSchedulesService extends createJobSchedules({ schedules: GOAL_PROGRESS_SCHEDULES, label: 'goal progress' }) {}
