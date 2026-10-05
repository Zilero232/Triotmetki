import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { MeMissionsController } from './me-missions.controller';
import { MissionsController } from './missions.controller';
import { MissionCatalogReaderService } from './services/mission-catalog-reader.service';
import { MissionPlanReaderService } from './services/mission-plan-reader.service';
import { MissionProgressReaderService } from './services/mission-progress-reader.service';
import { MissionProgressWriterService } from './services/mission-progress-writer.service';
import { MissionTanksReaderService } from './services/mission-tanks-reader.service';

@Module({
  imports: [AccountsModule, BillingCoreModule],
  controllers: [MissionsController, MeMissionsController],
  providers: [
    MissionCatalogReaderService,
    MissionTanksReaderService,
    MissionProgressReaderService,
    MissionProgressWriterService,
    MissionPlanReaderService
  ],
  exports: [MissionProgressReaderService]
})
export class MissionsModule {}
