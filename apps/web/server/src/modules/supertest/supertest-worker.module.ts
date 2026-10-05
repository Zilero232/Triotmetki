import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ScrapeModule } from '../../core';
import { SUPERTEST_QUEUE } from './config/queue.constants';
import { SupertestSchedulesService } from './processors/supertest-schedules.service';
import { SupertestProcessor } from './processors/supertest.processor';
import { SupertestSyncService } from './services/supertest-sync.service';

@Module({
  imports: [ScrapeModule, BullModule.registerQueue({ name: SUPERTEST_QUEUE.name })],
  providers: [SupertestSyncService, SupertestProcessor, SupertestSchedulesService]
})
export class SupertestWorkerModule {}
