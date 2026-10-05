import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { AnalyticsModule } from '../analytics';
import { BillingCoreModule } from '../billing';
import { ModModule } from '../mod';
import { ModSyncModule } from '../mod-sync';
import { PlayersModule } from '../players';
import { DataExportController } from './data-export.controller';
import { MeController } from './me.controller';
import { ModGoalsController } from './mod-goals.controller';
import { DataExportReaderService } from './services/data-export-reader.service';
import { FavoritesWriterService } from './services/favorites-writer.service';
import { GoalsWriterService } from './services/goals-writer.service';
import { LinkedAccountsWriterService } from './services/linked-accounts-writer.service';
import { MyMarksReaderService } from './services/my-marks-reader.service';
import { NotificationSettingsWriterService } from './services/notification-settings-writer.service';

@Module({
  imports: [AccountsModule, BillingCoreModule, PlayersModule, AnalyticsModule, ModModule, ModSyncModule],
  controllers: [MeController, DataExportController, ModGoalsController],
  providers: [
    DataExportReaderService,
    FavoritesWriterService,
    GoalsWriterService,
    NotificationSettingsWriterService,
    LinkedAccountsWriterService,
    MyMarksReaderService
  ]
})
export class MeModule {}
