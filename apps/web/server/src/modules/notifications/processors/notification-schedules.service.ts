import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { NOTIFICATION_SCHEDULES } from '../config/schedules.constants';

@Injectable()
export class NotificationSchedulesService extends createJobSchedules({ schedules: NOTIFICATION_SCHEDULES, label: 'notification' }) {}
