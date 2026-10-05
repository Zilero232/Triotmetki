import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { ModRatingsController } from './mod-ratings.controller';
import { ModController } from './mod.controller';
import { modRatingsQueriesProvider } from './providers/mod-ratings-queries.provider';
import { EventLedgerService } from './services/event-ledger.service';
import { ModBindWriterService } from './services/mod-bind-writer.service';
import { ModDeviceService } from './services/mod-device.service';
import { ModIngestWriterService } from './services/mod-ingest-writer.service';
import { ModRatingsReaderService } from './services/mod-ratings-reader.service';

@Module({
  imports: [UserLestaAccountsModule],
  controllers: [ModController, ModRatingsController],
  providers: [EventLedgerService, ModBindWriterService, ModDeviceService, ModIngestWriterService, ModRatingsReaderService, modRatingsQueriesProvider],
  exports: [ModDeviceService]
})
export class ModModule {}
