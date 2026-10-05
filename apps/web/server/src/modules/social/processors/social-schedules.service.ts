import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { SOCIAL_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class SocialSchedulesService extends createJobSchedules({ schedules: SOCIAL_SCHEDULES, label: 'social' }) {}
