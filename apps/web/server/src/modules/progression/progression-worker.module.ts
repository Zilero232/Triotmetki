import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { NotificationsProducerModule } from '../notifications';
import { PROGRESSION_QUEUE } from './config/queue.constants';
import { ProgressionSchedulesService } from './processors/progression-schedules.service';
import { ProgressionProcessor } from './processors/progression.processor';
import { ProgressionCoreModule } from './progression-core.module';
import { ProgressionAggregateService } from './services/progression-aggregate.service';
import { SeasonRewardsWriterService } from './services/season-rewards-writer.service';

@Module({
  imports: [BillingCoreModule, NotificationsProducerModule, ProgressionCoreModule, BullModule.registerQueue({ name: PROGRESSION_QUEUE.name })],
  providers: [SeasonRewardsWriterService, ProgressionAggregateService, ProgressionProcessor, ProgressionSchedulesService]
})
export class ProgressionWorkerModule {}
