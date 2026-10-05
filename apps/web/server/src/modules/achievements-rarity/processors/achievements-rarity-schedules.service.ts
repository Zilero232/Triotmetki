import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { ACHIEVEMENTS_RARITY_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class AchievementsRaritySchedulesService extends createJobSchedules({
  schedules: ACHIEVEMENTS_RARITY_SCHEDULES,
  label: 'achievements-rarity'
}) {}
