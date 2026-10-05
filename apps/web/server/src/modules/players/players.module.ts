import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { PlayersController } from './players.controller';
import { playerQueriesProvider } from './providers/player-queries.provider';
import {
  PlayerAchievementsReaderService,
  PlayerCareerReaderService,
  PlayerHistoryReaderService,
  PlayerInsightsReaderService,
  PlayerMarksReaderService,
  PlayerOfficialRatingsReaderService,
  PlayerPlaytimeReaderService,
  PlayerResolverService,
  PlayerSessionsReaderService,
  PlayerSummaryReaderService,
  PlayerTanksReaderService,
  PlayerViewsService
} from './services';

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
