import { Module } from '@nestjs/common';

import { PurgeGuardModule } from '../collector';
import { ClansController } from './clans.controller';
import { ClanListService } from './services/clan-list.service';
import { ClanPageService } from './services/clan-page.service';
import { ClanResolverService } from './services/clan-resolver.service';
import { ClanStrongholdReaderService } from './services/clan-stronghold-reader.service';

@Module({
  imports: [PurgeGuardModule],
  controllers: [ClansController],
  providers: [ClanResolverService, ClanPageService, ClanListService, ClanStrongholdReaderService],
  exports: [ClanResolverService, ClanPageService, ClanListService]
})
export class ClansModule {}
