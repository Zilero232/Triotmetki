import { Module } from '@nestjs/common';

import { MarksController } from './marks.controller';
import { MoePublicController } from './moe-public.controller';
import { ModThresholdsReaderService } from './services/mod-thresholds-reader.service';
import { MoeCurveReaderService } from './services/moe-curve-reader.service';
import { MoeTableReaderService } from './services/moe-table-reader.service';
import { ProjectionReaderService } from './services/projection-reader.service';
import { SweatIndexReaderService } from './services/sweat-index-reader.service';

@Module({
  controllers: [MarksController, MoePublicController],
  providers: [MoeTableReaderService, MoeCurveReaderService, ModThresholdsReaderService, ProjectionReaderService, SweatIndexReaderService],
  exports: [MoeTableReaderService, SweatIndexReaderService]
})
export class MarksModule {}
