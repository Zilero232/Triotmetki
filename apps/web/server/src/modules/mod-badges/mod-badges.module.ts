import { Module } from '@nestjs/common';

import { ModModule } from '../mod';
import { ModBadgesController } from './mod-badges.controller';
import { ModBadgeQuotaWriterService } from './services/mod-badge-quota-writer.service';
import { ModBadgeWriterService } from './services/mod-badge-writer.service';
import { ModBadgesReaderService } from './services/mod-badges-reader.service';

@Module({
  imports: [ModModule],
  controllers: [ModBadgesController],
  providers: [ModBadgesReaderService, ModBadgeWriterService, ModBadgeQuotaWriterService]
})
export class ModBadgesModule {}
