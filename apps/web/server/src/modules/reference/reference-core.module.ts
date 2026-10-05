import { Global, Module } from '@nestjs/common';

import { expectedValuesQueriesProvider } from './providers/expected-values-queries.provider';
import { thresholdsQueriesProvider } from './providers/thresholds-queries.provider';
import { BronyaReferencesReaderService } from './services/bronya-references-reader.service';
import { ExpectedValuesReaderService } from './services/expected-values-reader.service';
import { OfficialRatingTypesReaderService } from './services/official-rating-types-reader.service';
import { ThresholdsReaderService } from './services/thresholds-reader.service';
import { VehicleCatalogService } from './services/vehicle-catalog.service';

@Global()
@Module({
  providers: [
    expectedValuesQueriesProvider,
    thresholdsQueriesProvider,
    VehicleCatalogService,
    ExpectedValuesReaderService,
    ThresholdsReaderService,
    BronyaReferencesReaderService,
    OfficialRatingTypesReaderService
  ],
  exports: [
    VehicleCatalogService,
    ExpectedValuesReaderService,
    ThresholdsReaderService,
    BronyaReferencesReaderService,
    OfficialRatingTypesReaderService
  ]
})
export class ReferenceCoreModule {}
