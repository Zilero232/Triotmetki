import { Module } from '@nestjs/common';

import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardService } from './services/leaderboard.service';
import { OfficialRatingsService } from './services/official-ratings.service';

@Module({
  controllers: [LeaderboardsController],
  providers: [LeaderboardService, OfficialRatingsService],
  exports: [LeaderboardService]
})
export class LeaderboardsModule {}
