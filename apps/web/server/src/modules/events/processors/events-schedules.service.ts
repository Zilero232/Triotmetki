import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { EVENTS_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class EventsSchedulesService extends createJobSchedules({ schedules: EVENTS_SCHEDULES, label: 'events' }) {}
