import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { PULSE_SCHEDULES } from '../config/pulse.constants';

@Injectable()
export class PulseSchedulesService extends createJobSchedules({ schedules: PULSE_SCHEDULES, label: 'pulse' }) {}
