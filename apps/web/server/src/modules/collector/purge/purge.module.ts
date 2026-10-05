import { Module } from '@nestjs/common';

import { ObjectStorageModule, STORAGE_ROOT } from '../../../core';
import { PurgeProcessor } from './processors';
import { PurgeGuardModule } from './purge-guard.module';
import { PurgeService, RetentionService } from './services';

@Module({
  imports: [PurgeGuardModule, ObjectStorageModule.register({ root: STORAGE_ROOT.replays })],
  providers: [PurgeService, RetentionService, PurgeProcessor],
  exports: [PurgeGuardModule]
})
export class PurgeModule {}
