import { Module } from '@nestjs/common';

import { PlayerRatingsAggregatesModule } from '../player-ratings';
import { tankStatsQueriesProvider } from './providers/tank-stats-queries.provider';
import { LearningCurveAggregateService } from './services/learning-curve-aggregate.service';
import { TankEconomyAggregateService } from './services/tank-economy-aggregate.service';
import { TankPercentilesAggregateService } from './services/tank-percentiles-aggregate.service';

@Module({
  imports: [PlayerRatingsAggregatesModule],
  providers: [tankStatsQueriesProvider, TankEconomyAggregateService, LearningCurveAggregateService, TankPercentilesAggregateService],
  exports: [TankEconomyAggregateService, LearningCurveAggregateService, TankPercentilesAggregateService]
})
export class TankStatsAggregatesModule {}
