import { Module } from '@nestjs/common';

import { ReferenceCoreModule } from './reference-core.module';
import { ReferenceController } from './reference.controller';
import { GameVersionReaderService } from './services/game-version-reader.service';
import { ServersOnlineReaderService } from './services/servers-online-reader.service';

@Module({
  imports: [ReferenceCoreModule],
  controllers: [ReferenceController],
  providers: [GameVersionReaderService, ServersOnlineReaderService]
})
export class ReferenceModule {}
