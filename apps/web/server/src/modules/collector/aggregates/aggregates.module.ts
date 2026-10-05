import { Module } from '@nestjs/common';

import { MetaAggregatesModule } from './meta';
import { PlayerRatingsAggregatesModule } from './player-ratings';
import { AggregateProcessor } from './processors/aggregate.processor';
import { ServerAggregatesModule } from './server';
import { TankStatsAggregatesModule } from './tank-stats';

@Module({
  imports: [PlayerRatingsAggregatesModule, TankStatsAggregatesModule, MetaAggregatesModule, ServerAggregatesModule],
  providers: [AggregateProcessor]
})
export class AggregatesModule {}
