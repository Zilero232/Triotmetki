import { Module } from '@nestjs/common';

import { ModModule } from '../mod';
import { ModBadgesController } from './mod-badges.controller';
import { ModBadgeWriterService } from './services/mod-badge-writer.service';
import { ModBadgesReaderService } from './services/mod-badges-reader.service';

@Module({
  imports: [ModModule],
  controllers: [ModBadgesController],
  providers: [ModBadgesReaderService, ModBadgeWriterService]
})
export class ModBadgesModule {}
