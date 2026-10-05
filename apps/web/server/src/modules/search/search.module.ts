import { Module } from '@nestjs/common';

import { PurgeGuardModule } from '../collector';
import { SearchController } from './search.controller';
import { PlayerDiscoveryWriterService } from './services/player-discovery-writer.service';
import { SearchReaderService } from './services/search-reader.service';

@Module({
  imports: [PurgeGuardModule],
  controllers: [SearchController],
  providers: [PlayerDiscoveryWriterService, SearchReaderService]
})
export class SearchModule {}
