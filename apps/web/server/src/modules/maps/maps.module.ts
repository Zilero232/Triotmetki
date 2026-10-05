import { Module } from '@nestjs/common';

import { MapsController } from './maps.controller';
import { MapsReaderService } from './services/maps-reader.service';
import { TankMapStatsReaderService } from './services/tank-map-stats-reader.service';
import { TankMapsController } from './tank-maps.controller';

@Module({
  controllers: [MapsController, TankMapsController],
  providers: [MapsReaderService, TankMapStatsReaderService]
})
export class MapsModule {}
