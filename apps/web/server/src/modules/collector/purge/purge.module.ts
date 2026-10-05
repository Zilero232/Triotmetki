import { Module } from '@nestjs/common';

import { ObjectStorageModule, STORAGE_ROOT } from '../../../core';
import { PurgeProcessor } from './processors/purge.processor';
import { purgeQueriesProvider } from './providers/purge-queries.provider';
import { retentionQueriesProvider } from './providers/retention-queries.provider';
import { PurgeGuardModule } from './purge-guard.module';
import { PurgeService } from './services/purge.service';
import { RetentionService } from './services/retention.service';

@Module({
  imports: [PurgeGuardModule, ObjectStorageModule.register({ root: STORAGE_ROOT.replays })],
  providers: [purgeQueriesProvider, retentionQueriesProvider, PurgeService, RetentionService, PurgeProcessor],
  exports: [PurgeGuardModule]
})
export class PurgeModule {}
