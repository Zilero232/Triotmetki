import { Global, Module } from '@nestjs/common';

import { expectedValuesQueriesProvider } from './providers/expected-values-queries.provider';
import { thresholdsQueriesProvider } from './providers/thresholds-queries.provider';
import { BronyaReferencesService } from './services/bronya-references.service';
import { ExpectedValuesService } from './services/expected-values.service';
import { OfficialRatingTypesService } from './services/official-rating-types.service';
import { ThresholdsService } from './services/thresholds.service';
import { VehicleCatalogService } from './services/vehicle-catalog.service';

@Global()
@Module({
  providers: [
    expectedValuesQueriesProvider,
    thresholdsQueriesProvider,
    VehicleCatalogService,
    ExpectedValuesService,
    ThresholdsService,
    BronyaReferencesService,
    OfficialRatingTypesService
  ],
  exports: [VehicleCatalogService, ExpectedValuesService, ThresholdsService, BronyaReferencesService, OfficialRatingTypesService]
})
export class ReferenceCoreModule {}
