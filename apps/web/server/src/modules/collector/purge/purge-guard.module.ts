import { Module } from '@nestjs/common';

import { PurgeGuardService } from './services/purge-guard.service';

@Module({
  providers: [PurgeGuardService],
  exports: [PurgeGuardService]
})
export class PurgeGuardModule {}
