import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ACHIEVEMENTS_RARITY_QUEUE } from './config/queue.constants';
import { AchievementsRaritySchedulesService } from './processors/achievements-rarity-schedules.service';
import { AchievementsRarityProcessor } from './processors/achievements-rarity.processor';
import { AchievementsSyncService } from './services/achievements-sync.service';
import { RarityAggregateService } from './services/rarity-aggregate.service';

@Module({
  imports: [BullModule.registerQueue({ name: ACHIEVEMENTS_RARITY_QUEUE.name })],
  providers: [AchievementsSyncService, RarityAggregateService, AchievementsRarityProcessor, AchievementsRaritySchedulesService]
})
export class AchievementsRarityWorkerModule {}
