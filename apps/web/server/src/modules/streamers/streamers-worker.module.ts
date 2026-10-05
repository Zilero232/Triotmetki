import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { StreamerChallengesWorkerModule } from './challenges';
import { STREAMERS_QUEUE } from './config/queue.constants';
import { StreamerLiveModule } from './live';
import { StreamerPredictionsModule } from './predictions';
import { StreamersSchedulesService } from './processors/streamers-schedules.service';
import { StreamersProcessor } from './processors/streamers.processor';
import { StreamerSettingsModule } from './settings';

@Module({
  imports: [
    StreamerChallengesWorkerModule,
    StreamerLiveModule,
    StreamerPredictionsModule,
    StreamerSettingsModule,
    BullModule.registerQueue({ name: STREAMERS_QUEUE.name })
  ],
  providers: [StreamersProcessor, StreamersSchedulesService]
})
export class StreamersWorkerModule {}
