import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { COMMUNITY_SCHEDULES } from '../config/community-maintenance.constants';

@Injectable()
export class CommunitySchedulesService extends createJobSchedules({
  schedules: COMMUNITY_SCHEDULES,
  label: 'community'
}) {}
