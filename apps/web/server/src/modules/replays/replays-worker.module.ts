import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ObjectStorageModule } from '../../core';
import { PurgeGuardModule } from '../collector/purge';
import { NotificationsProducerModule } from '../notifications';
import { REPLAY_FILES } from './config/files.constants';
import { REPLAYS_QUEUE } from './config/queue.constants';
import { ReplaysSchedulesService } from './processors/replays-schedules.service';
import { ReplaysProcessor } from './processors/replays.processor';
import { BestOfWeekAggregateService } from './services/best-of-week-aggregate.service';
import { HeatmapWriterService } from './services/heatmap-writer.service';
import { ReplayOverflowService } from './services/replay-overflow.service';
import { ReplayParseService } from './services/replay-parse.service';
import { ReplayTagAggregateService } from './services/replay-tag-aggregate.service';

@Module({
  imports: [
    NotificationsProducerModule,
    PurgeGuardModule,
    ObjectStorageModule.register({ root: REPLAY_FILES.root }),
    BullModule.registerQueue({ name: REPLAYS_QUEUE.name })
  ],
  providers: [
    ReplayParseService,
    HeatmapWriterService,
    BestOfWeekAggregateService,
    ReplayOverflowService,
    ReplayTagAggregateService,
    ReplaysProcessor,
    ReplaysSchedulesService
  ]
})
export class ReplaysWorkerModule {}
