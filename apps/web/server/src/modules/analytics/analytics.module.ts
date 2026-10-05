import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { MissionsModule } from '../missions';
import { PlayersModule } from '../players';
import { UsageModule } from '../usage';
import { AnalyticsCoreModule } from './analytics-core.module';
import { AnalyticsController } from './analytics.controller';
import { analyticsQueriesProvider } from './providers/analytics-queries.provider';
import { AnalyticsOverviewReaderService } from './services/analytics-overview-reader.service';
import { BattleReviewReaderService } from './services/battle-review-reader.service';
import { HonestRngReaderService } from './services/honest-rng-reader.service';
import { MapAdvisorReaderService } from './services/map-advisor-reader.service';
import { PlatoonChemistryReaderService } from './services/platoon-chemistry-reader.service';
import { PlaylistReaderService } from './services/playlist-reader.service';
import { TankAnalyticsReaderService } from './services/tank-analytics-reader.service';

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
