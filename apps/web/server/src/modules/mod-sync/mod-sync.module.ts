import { Module } from '@nestjs/common';

import { ModModule } from '../mod';
import { ModSyncAccountController } from './mod-sync-account.controller';
import { ModSyncController } from './mod-sync.controller';
import { ModSyncWriterService } from './services/mod-sync-writer.service';

@Module({
  imports: [ModModule],
  controllers: [ModSyncController, ModSyncAccountController],
  providers: [ModSyncWriterService],
  exports: [ModSyncWriterService]
})
export class ModSyncModule {}
