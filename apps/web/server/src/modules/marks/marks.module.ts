import { Module } from '@nestjs/common';

import { MarksController } from './marks.controller';
import { MoePublicController } from './moe-public.controller';
import { ModThresholdsReaderService } from './services/mod-thresholds-reader.service';
import { MoeCurveReaderService } from './services/moe-curve-reader.service';
import { MoeTableService } from './services/moe-table.service';
import { ProjectionReaderService } from './services/projection-reader.service';
import { SweatIndexService } from './services/sweat-index.service';

@Module({
  controllers: [MarksController, MoePublicController],
  providers: [MoeTableService, MoeCurveReaderService, ModThresholdsReaderService, ProjectionReaderService, SweatIndexService],
  exports: [MoeTableService, SweatIndexService]
})
export class MarksModule {}
