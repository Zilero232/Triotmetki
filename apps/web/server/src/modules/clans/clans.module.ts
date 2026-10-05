import { Module } from '@nestjs/common';

import { PurgeGuardModule } from '../collector';
import { ClansController } from './clans.controller';
import { ClanListReaderService } from './services/clan-list-reader.service';
import { ClanPageReaderService } from './services/clan-page-reader.service';
import { ClanResolverService } from './services/clan-resolver.service';
import { ClanStrongholdReaderService } from './services/clan-stronghold-reader.service';

@Module({
  imports: [PurgeGuardModule],
  controllers: [ClansController],
  providers: [ClanResolverService, ClanPageReaderService, ClanListReaderService, ClanStrongholdReaderService],
  exports: [ClanResolverService, ClanPageReaderService, ClanListReaderService]
})
export class ClansModule {}
