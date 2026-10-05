import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { MissionsModule } from '../missions';
import { PlayersModule } from '../players';
import { UsageModule } from '../usage';
import { AnalyticsCoreModule } from './analytics-core.module';
import { AnalyticsController } from './analytics.controller';
import { analyticsQueriesProvider } from './providers/analytics-queries.provider';
import {
  AnalyticsOverviewReaderService,
  BattleReviewReaderService,
  HonestRngReaderService,
  MapAdvisorReaderService,
  PlatoonChemistryReaderService,
  PlaylistReaderService,
  TankAnalyticsReaderService
} from './services';

@Module({
  imports: [AnalyticsCoreModule, BillingCoreModule, PlayersModule, MissionsModule, UsageModule],
  controllers: [AnalyticsController],
  providers: [
    analyticsQueriesProvider,
    AnalyticsOverviewReaderService,
    TankAnalyticsReaderService,
    MapAdvisorReaderService,
    PlatoonChemistryReaderService,
    HonestRngReaderService,
    BattleReviewReaderService,
    PlaylistReaderService
  ],
  exports: [PlaylistReaderService, AnalyticsCoreModule]
})
export class AnalyticsModule {}
