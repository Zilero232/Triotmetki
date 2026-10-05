import { Module } from '@nestjs/common';

import { CommunityCoreModule } from '../community-core';
import { CoachingController } from './coaching.controller';
import { CoachProfileWriterService } from './services/coach-profile-writer.service';
import { CoachingOrderWriterService } from './services/coaching-order-writer.service';

@Module({
  imports: [CommunityCoreModule],
  controllers: [CoachingController],
  providers: [CoachProfileWriterService, CoachingOrderWriterService]
})
export class CoachingModule {}
