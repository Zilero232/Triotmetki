import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../core';
import { NotificationsProducerModule } from '../notifications';
import { LESTA_LINKS_QUEUE } from './config/lesta-links-queue.constants';
import { LestaLinksSchedulesService } from './processors/lesta-links-schedules.service';
import { LestaLinksProcessor } from './processors/lesta-links.processor';
import { GarageSyncService } from './services/garage-sync.service';
import { TokenRenewalService } from './services/token-renewal.service';

@Module({
  imports: [BullModule.registerQueue({ name: LESTA_LINKS_QUEUE.name }), NotificationsProducerModule, TokenCipherModule],
  providers: [GarageSyncService, TokenRenewalService, LestaLinksProcessor, LestaLinksSchedulesService]
})
export class LestaLinksWorkerModule {}
