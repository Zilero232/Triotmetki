import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { STREAMERS_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class StreamersSchedulesService extends createJobSchedules({ schedules: STREAMERS_SCHEDULES, label: 'streamer' }) {}
