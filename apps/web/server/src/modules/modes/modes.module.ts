import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { PlayersModule } from '../players';
import { ModesController } from './modes.controller';
import { modesQueriesProvider } from './providers/modes-queries.provider';
import { ModeMetaReaderService, MyModeStatsReaderService } from './services';

@Module({
  imports: [UserLestaAccountsModule, BillingCoreModule, PlayersModule],
  controllers: [ModesController],
  providers: [modesQueriesProvider, ModeMetaReaderService, MyModeStatsReaderService]
})
export class ModesModule {}
