import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { SESSION_SHARE_QUEUE } from './config/session-share-queue.constants';
import { SessionShareQueueService } from './services/session-share-queue.service';

@Module({
  imports: [BullModule.registerQueue({ name: SESSION_SHARE_QUEUE.name })],
  providers: [SessionShareQueueService],
  exports: [SessionShareQueueService]
})
export class SessionShareProducerModule {}
