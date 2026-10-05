import { Module } from '@nestjs/common';

import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardReaderService } from './services/leaderboard-reader.service';
import { OfficialRatingsService } from './services/official-ratings.service';

@Module({
  controllers: [LeaderboardsController],
  providers: [LeaderboardReaderService, OfficialRatingsService],
  exports: [LeaderboardReaderService]
})
export class LeaderboardsModule {}
