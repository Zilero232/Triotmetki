import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../core';
import { NotificationsProducerModule } from '../notifications';
import { LESTA_LINKS_QUEUE } from './config';
import { LestaLinksProcessor, LestaLinksSchedulesService } from './processors';
import { GarageSyncService, TokenRenewalService } from './services';

@Module({
  imports: [BullModule.registerQueue({ name: LESTA_LINKS_QUEUE.name }), NotificationsProducerModule, TokenCipherModule],
  providers: [GarageSyncService, TokenRenewalService, LestaLinksProcessor, LestaLinksSchedulesService]
})
export class LestaLinksWorkerModule {}
