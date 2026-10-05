import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ObjectStorageModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { ModModule } from '../mod';
import { REPLAY_FILES } from './config/files.constants';
import { REPLAYS_QUEUE } from './config/queue.constants';
import { ModReplaysController } from './mod-replays.controller';
import { ReplaysController } from './replays.controller';
import { HeatmapReaderService } from './services/heatmap-reader.service';
import { ReplayOwnerWriterService } from './services/replay-owner-writer.service';
import { ReplayReaderService } from './services/replay-reader.service';
import { ReplayStatusReaderService } from './services/replay-status-reader.service';
import { ReplayUploadWriterService } from './services/replay-upload-writer.service';

@Module({
  imports: [
    BillingCoreModule,
    ModModule,
    ObjectStorageModule.register({ root: REPLAY_FILES.root }),
    BullModule.registerQueue({ name: REPLAYS_QUEUE.name })
  ],
  controllers: [ReplaysController, ModReplaysController],
  providers: [ReplayUploadWriterService, ReplayReaderService, ReplayOwnerWriterService, ReplayStatusReaderService, HeatmapReaderService]
})
export class ReplaysModule {}
