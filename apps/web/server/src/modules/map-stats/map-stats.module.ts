import { Module } from '@nestjs/common';

import { MapStatsController } from './map-stats.controller';
import { MapStatsReaderService } from './services/map-stats-reader.service';

@Module({
  controllers: [MapStatsController],
  providers: [MapStatsReaderService]
})
export class MapStatsModule {}
