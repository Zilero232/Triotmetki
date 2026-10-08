import { Module } from '@nestjs/common';

import { PurgeGuardModule } from '../collector/purge';
import { ModModule } from '../mod';
import { ModBadgePresenceController } from './mod-badge-presence.controller';
import { ModBadgesController } from './mod-badges.controller';
import { ModBadgePresenceReaderService } from './services/mod-badge-presence-reader.service';
import { ModBadgePresenceWriterService } from './services/mod-badge-presence-writer.service';
import { ModBadgeQuotaWriterService } from './services/mod-badge-quota-writer.service';
import { ModBadgeWriterService } from './services/mod-badge-writer.service';
import { ModBadgesReaderService } from './services/mod-badges-reader.service';

@Module({
  imports: [ModModule, PurgeGuardModule],
  controllers: [ModBadgesController, ModBadgePresenceController],
  providers: [ModBadgesReaderService, ModBadgeWriterService, ModBadgeQuotaWriterService, ModBadgePresenceReaderService, ModBadgePresenceWriterService]
})
export class ModBadgesModule {}
