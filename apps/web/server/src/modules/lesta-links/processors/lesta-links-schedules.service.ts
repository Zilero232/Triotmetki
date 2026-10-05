import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { LESTA_LINKS_SCHEDULES } from '../config/lesta-links-queue.constants';

@Injectable()
export class LestaLinksSchedulesService extends createJobSchedules({ schedules: LESTA_LINKS_SCHEDULES, label: 'lesta-links' }) {}
