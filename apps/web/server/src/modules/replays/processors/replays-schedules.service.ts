import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { REPLAYS_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class ReplaysSchedulesService extends createJobSchedules({ schedules: REPLAYS_SCHEDULES, label: 'replays' }) {}
