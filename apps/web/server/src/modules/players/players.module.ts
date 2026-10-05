import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { PlayersController } from './players.controller';
import {
  PlayerAchievementsService,
  PlayerCareerService,
  PlayerHistoryService,
  PlayerInsightsService,
  PlayerMarksService,
  PlayerOfficialRatingsService,
  PlayerPlaytimeService,
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
    PlayerAchievementsService,
    PlayerResolverService,
    PlayerSummaryService,
    PlayerTanksService,
    PlayerHistoryService,
    PlayerSessionsService,
    PlayerMarksService,
    PlayerInsightsService,
    PlayerPlaytimeService,
    PlayerViewsService,
    PlayerCareerService,
    PlayerOfficialRatingsService
  ],
  exports: [
    PlayerResolverService,
    PlayerSummaryService,
    PlayerTanksService,
    PlayerHistoryService,
    PlayerSessionsService,
    PlayerMarksService,
    PlayerCareerService
  ]
})
export class PlayersModule {}
