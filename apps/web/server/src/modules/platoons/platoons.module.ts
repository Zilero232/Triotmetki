import { Module } from '@nestjs/common';

import { CommunityCoreModule } from '../community-core';
import { PlatoonsController } from './platoons.controller';
import { PlatoonWriterService } from './services/platoon-writer.service';

@Module({
  imports: [CommunityCoreModule],
  controllers: [PlatoonsController],
  providers: [PlatoonWriterService]
})
export class PlatoonsModule {}
