import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { BATTLE_EVENTS } from '../../../core';
import { STREAMERS_QUEUE } from '../config/queue.constants';
import { PredictionsTriggerService } from './services/predictions-trigger.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: STREAMERS_QUEUE.name })],
  providers: [PredictionsTriggerService, { provide: BATTLE_EVENTS, useExisting: PredictionsTriggerService }],
  exports: [BATTLE_EVENTS]
})
export class StreamerEventsModule {}
