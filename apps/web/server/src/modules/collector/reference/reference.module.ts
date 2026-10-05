import { Module } from '@nestjs/common';

import { HttpModule } from '../../../core';
import { ReferenceProcessor } from './processors/reference.processor';
import { referenceQueriesProvider } from './providers/reference-queries.provider';
import { CatalogSyncService } from './services/catalog-sync.service';
import { EncyclopediaSyncService } from './services/encyclopedia-sync.service';
import { EquipmentSyncService } from './services/equipment-sync.service';
import { ExpectedValuesSyncService } from './services/expected-values-sync.service';
import { MasteryThresholdsSyncService } from './services/mastery-thresholds-sync.service';
import { MoeEstimateAggregateService } from './services/moe-estimate-aggregate.service';
import { MoeThresholdsSyncService } from './services/moe-thresholds-sync.service';
import { VehicleSyncService } from './services/vehicle-sync.service';

@Module({
  imports: [HttpModule],
  providers: [
    referenceQueriesProvider,
    EncyclopediaSyncService,
    VehicleSyncService,
    EquipmentSyncService,
    CatalogSyncService,
    ExpectedValuesSyncService,
    MoeThresholdsSyncService,
    MoeEstimateAggregateService,
    MasteryThresholdsSyncService,
    ReferenceProcessor
  ]
})
export class ReferenceModule {}
