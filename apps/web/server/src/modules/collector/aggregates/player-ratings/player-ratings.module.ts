import { Module } from '@nestjs/common';

import { playerRatingsQueriesProvider } from './providers/player-ratings-queries.provider';
import { AccountRatingsAggregateService } from './services/account-ratings-aggregate.service';
import { ReferenceTablesService } from './services/reference-tables.service';

@Module({
  providers: [playerRatingsQueriesProvider, ReferenceTablesService, AccountRatingsAggregateService],
  exports: [ReferenceTablesService, AccountRatingsAggregateService]
})
export class PlayerRatingsAggregatesModule {}
