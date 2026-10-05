import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { CommunityCoreModule } from '../community-core';
import { PlatoonWriterService } from '../platoons';
import { RecruitingWriterService } from '../recruiting';
import { COMMUNITY_QUEUE } from './config/community-maintenance.constants';
import { CommunitySchedulesService } from './processors/community-schedules.service';
import { CommunityProcessor } from './processors/community.processor';

@Module({
  imports: [CommunityCoreModule, BullModule.registerQueue({ name: COMMUNITY_QUEUE.name })],
  providers: [PlatoonWriterService, RecruitingWriterService, CommunityProcessor, CommunitySchedulesService]
})
export class CommunityMaintenanceWorkerModule {}
