import { Module } from '@nestjs/common';

import { PlayerRatingsAggregatesModule } from '../player-ratings';
import { serverQueriesProvider } from './providers/server-queries.provider';
import { ServerStatsAggregateService } from './services/server-stats-aggregate.service';
import { TrackingTierAggregateService } from './services/tracking-tier-aggregate.service';

@Module({
  imports: [PlayerRatingsAggregatesModule],
  providers: [serverQueriesProvider, ServerStatsAggregateService, TrackingTierAggregateService],
  exports: [ServerStatsAggregateService, TrackingTierAggregateService]
})
export class ServerAggregatesModule {}
