import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PULSE_QUEUE } from './config/pulse.constants';
import { PulseSchedulesService } from './processors/pulse-schedules.service';
import { PulseProcessor } from './processors/pulse.processor';
import { PulseAggregateService } from './services/pulse-aggregate.service';

@Module({
  imports: [BullModule.registerQueue({ name: PULSE_QUEUE.name })],
  providers: [PulseAggregateService, PulseProcessor, PulseSchedulesService]
})
export class PulseWorkerModule {}
