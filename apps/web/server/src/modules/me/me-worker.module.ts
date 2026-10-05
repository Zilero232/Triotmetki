import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { ReferenceCoreModule } from '../reference';
import { GOAL_PROGRESS_QUEUE } from './config/goal-progress.constants';
import { GoalProgressSchedulesService } from './processors/goal-progress-schedules.service';
import { GoalProgressProcessor } from './processors/goal-progress.processor';
import { GoalProgressAggregateService } from './services/goal-progress-aggregate.service';

@Module({
  imports: [NotificationsProducerModule, ReferenceCoreModule, BullModule.registerQueue({ name: GOAL_PROGRESS_QUEUE.name })],
  providers: [GoalProgressAggregateService, GoalProgressProcessor, GoalProgressSchedulesService]
})
export class MeWorkerModule {}
