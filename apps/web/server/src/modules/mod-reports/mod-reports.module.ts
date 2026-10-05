import { Module } from '@nestjs/common';

import { ModReportsController } from './mod-reports.controller';
import { ModReportsWriterService } from './services/mod-reports-writer.service';

@Module({
  controllers: [ModReportsController],
  providers: [ModReportsWriterService]
})
export class ModReportsModule {}
