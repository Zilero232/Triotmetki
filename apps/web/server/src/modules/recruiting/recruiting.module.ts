import { Module } from '@nestjs/common';

import { CommunityCoreModule } from '../community-core';
import { RecruitingController } from './recruiting.controller';
import { RecruitingWriterService } from './services/recruiting-writer.service';

@Module({
  imports: [CommunityCoreModule],
  controllers: [RecruitingController],
  providers: [RecruitingWriterService]
})
export class RecruitingModule {}
