import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { PlayersController } from './players.controller';
import { playerQueriesProvider } from './providers/player-queries.provider';
import { PlayerAchievementsReaderService } from './services/player-achievements-reader.service';
import { PlayerCareerReaderService } from './services/player-career-reader.service';
import { PlayerHistoryReaderService } from './services/player-history-reader.service';
import { PlayerInsightsReaderService } from './services/player-insights-reader.service';
import { PlayerMarksReaderService } from './services/player-marks-reader.service';
import { PlayerOfficialRatingsReaderService } from './services/player-official-ratings-reader.service';
import { PlayerPlaytimeReaderService } from './services/player-playtime-reader.service';
import { PlayerResolverService } from './services/player-resolver.service';
import { PlayerSessionsReaderService } from './services/player-sessions-reader.service';
import { PlayerSummaryReaderService } from './services/player-summary-reader.service';
import { PlayerTanksReaderService } from './services/player-tanks-reader.service';
import { PlayerViewsService } from './services/player-views.service';

@Module({
  imports: [BillingCoreModule, PurgeGuardModule],
  controllers: [PlayersController],
  providers: [
    playerQueriesProvider,
    PlayerAchievementsReaderService,
    PlayerResolverService,
    PlayerSummaryReaderService,
    PlayerTanksReaderService,
    PlayerHistoryReaderService,
    PlayerSessionsReaderService,
    PlayerMarksReaderService,
    PlayerInsightsReaderService,
    PlayerPlaytimeReaderService,
    PlayerViewsService,
    PlayerCareerReaderService,
    PlayerOfficialRatingsReaderService
  ],
  exports: [
    PlayerResolverService,
    PlayerSummaryReaderService,
    PlayerTanksReaderService,
    PlayerHistoryReaderService,
    PlayerSessionsReaderService,
    PlayerMarksReaderService,
    PlayerCareerReaderService
  ]
})
export class PlayersModule {}
