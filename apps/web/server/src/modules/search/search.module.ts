import { Module } from '@nestjs/common';

import { PurgeGuardModule } from '../collector';
import { SearchController } from './search.controller';
import { LocalSearchService, PlayerDiscoveryService, SearchService } from './services';

@Module({
  imports: [PurgeGuardModule],
  controllers: [SearchController],
  providers: [LocalSearchService, PlayerDiscoveryService, SearchService]
})
export class SearchModule {}
