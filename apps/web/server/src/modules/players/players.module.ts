import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { PlayersController } from './players.controller';
import { playerQueriesProvider } from './providers/player-queries.provider';
import {
  PlayerAchievementsReaderService,
  PlayerCareerReaderService,
  PlayerHistoryService,
  PlayerInsightsReaderService,
  PlayerMarksService,
  PlayerOfficialRatingsReaderService,
  PlayerPlaytimeReaderService,
  PlayerResolverService,
  PlayerSessionsService,
  PlayerSummaryService,
  PlayerTanksService,
  PlayerViewsService
} from './services';

@Module({
  imports: [BillingCoreModule, PurgeGuardModule],
  controllers: [PlayersController],
  providers: [
    playerQueriesProvider,
    PlayerAchievementsReaderService,
    PlayerResolverService,
    PlayerSummaryService,
    PlayerTanksService,
    PlayerHistoryService,
    PlayerSessionsService,
    PlayerMarksService,
    PlayerInsightsReaderService,
    PlayerPlaytimeReaderService,
    PlayerViewsService,
    PlayerCareerReaderService,
    PlayerOfficialRatingsReaderService
  ],
  exports: [
    PlayerResolverService,
    PlayerSummaryService,
    PlayerTanksService,
    PlayerHistoryService,
    PlayerSessionsService,
    PlayerMarksService,
    PlayerCareerReaderService
  ]
})
export class PlayersModule {}
