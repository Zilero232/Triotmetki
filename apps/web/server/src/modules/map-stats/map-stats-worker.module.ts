import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { MAP_STATS_QUEUE } from './config/map-stats.constants';
import { MapStatsSchedulesService } from './processors/map-stats-schedules.service';
import { MapStatsProcessor } from './processors/map-stats.processor';
import { MapStatsAggregateService } from './services/map-stats-aggregate.service';

@Module({
  imports: [BullModule.registerQueue({ name: MAP_STATS_QUEUE.name })],
  providers: [MapStatsAggregateService, MapStatsProcessor, MapStatsSchedulesService]
})
export class MapStatsWorkerModule {}
