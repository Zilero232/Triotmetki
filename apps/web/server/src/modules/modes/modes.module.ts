import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { PlayersModule } from '../players';
import { ModesController } from './modes.controller';
import { modesQueriesProvider } from './providers/modes-queries.provider';
import { ModeMetaReaderService } from './services/mode-meta-reader.service';
import { MyModeStatsReaderService } from './services/my-mode-stats-reader.service';

@Module({
  imports: [AccountsModule, BillingCoreModule, PlayersModule],
  controllers: [ModesController],
  providers: [modesQueriesProvider, ModeMetaReaderService, MyModeStatsReaderService]
})
export class ModesModule {}
