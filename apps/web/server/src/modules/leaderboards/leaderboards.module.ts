import { Module } from '@nestjs/common';

import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardReaderService } from './services/leaderboard-reader.service';
import { OfficialRatingsReaderService } from './services/official-ratings-reader.service';

@Module({
  controllers: [LeaderboardsController],
  providers: [LeaderboardReaderService, OfficialRatingsReaderService],
  exports: [LeaderboardReaderService]
})
export class LeaderboardsModule {}
