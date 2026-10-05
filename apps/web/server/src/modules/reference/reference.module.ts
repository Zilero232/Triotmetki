import { Module } from '@nestjs/common';

import { ReferenceCoreModule } from './reference-core.module';
import { ReferenceController } from './reference.controller';
import { GameVersionService } from './services/game-version.service';
import { ServersOnlineService } from './services/servers-online.service';

@Module({
  imports: [ReferenceCoreModule],
  controllers: [ReferenceController],
  providers: [GameVersionService, ServersOnlineService]
})
export class ReferenceModule {}
