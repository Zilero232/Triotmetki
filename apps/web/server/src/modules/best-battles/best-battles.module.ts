import { Module } from '@nestjs/common';

import { BestBattlesController } from './best-battles.controller';
import { BestBattleFacetsReaderService } from './services/best-battle-facets-reader.service';
import { BestBattleLookupsReaderService } from './services/best-battle-lookups-reader.service';
import { BestBattlesReaderService } from './services/best-battles-reader.service';

@Module({
  controllers: [BestBattlesController],
  providers: [BestBattleLookupsReaderService, BestBattlesReaderService, BestBattleFacetsReaderService]
})
export class BestBattlesModule {}
