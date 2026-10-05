import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { HONEST_RNG_QUEUE } from './config/queue.constants';
import { HonestRngSchedulesService } from './processors/honest-rng-schedules.service';
import { HonestRngProcessor } from './processors/honest-rng.processor';
import { RngAggregateService } from './services/rng-aggregate.service';

@Module({
  imports: [BullModule.registerQueue({ name: HONEST_RNG_QUEUE.name })],
  providers: [RngAggregateService, HonestRngProcessor, HonestRngSchedulesService]
})
export class HonestRngWorkerModule {}
