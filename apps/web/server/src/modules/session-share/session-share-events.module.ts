import { Global, Module } from '@nestjs/common';

import { SESSION_EVENTS } from '../developer';
import { SessionShareQueueService } from './services/session-share-queue.service';
import { SessionShareProducerModule } from './session-share-producer.module';

@Global()
@Module({
  imports: [SessionShareProducerModule],
  providers: [{ provide: SESSION_EVENTS, useExisting: SessionShareQueueService }],
  exports: [SESSION_EVENTS]
})
export class SessionShareEventsModule {}
