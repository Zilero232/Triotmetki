import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { TanksModule } from '../tanks';
import { BuildsCatalogController } from './builds-catalog.controller';
import { BuildsController } from './builds.controller';
import { buildsCatalogQueriesProvider } from './providers/builds-catalog-queries.provider';
import { BuildAdviceReaderService } from './services/build-advice-reader.service';
import { BuildDataReaderService } from './services/build-data-reader.service';
import { BuildOptionsReaderService } from './services/build-options-reader.service';
import { BuildUsageReaderService } from './services/build-usage-reader.service';
import { BuildsCatalogReaderService } from './services/builds-catalog-reader.service';
import { LoadoutReaderService } from './services/loadout-reader.service';
import { PopularBuildsReaderService } from './services/popular-builds-reader.service';
import { RecommendedBuildReaderService } from './services/recommended-build-reader.service';

@Module({
  imports: [TanksModule, BillingCoreModule],
  controllers: [BuildsController, BuildsCatalogController],
  providers: [
    buildsCatalogQueriesProvider,
    BuildAdviceReaderService,
    BuildDataReaderService,
    BuildOptionsReaderService,
    LoadoutReaderService,
    PopularBuildsReaderService,
    BuildUsageReaderService,
    RecommendedBuildReaderService,
    BuildsCatalogReaderService
  ],
  exports: [BuildDataReaderService]
})
export class BuildsModule {}
