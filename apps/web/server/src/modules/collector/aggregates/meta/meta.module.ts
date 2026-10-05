import { Module } from '@nestjs/common';

import { metaQueriesProvider } from './providers/meta-queries.provider';
import { BuildUsageAggregateService } from './services/build-usage-aggregate.service';
import { ModeMetaAggregateService } from './services/mode-meta-aggregate.service';

@Module({
  providers: [metaQueriesProvider, ModeMetaAggregateService, BuildUsageAggregateService],
  exports: [ModeMetaAggregateService, BuildUsageAggregateService]
})
export class MetaAggregatesModule {}
