import { Global, Module } from '@nestjs/common';

import { WEBHOOK_EMITTER } from '../webhooks';
import { WebhookEmitterService } from './services/webhook-emitter.service';

@Global()
@Module({
  providers: [WebhookEmitterService, { provide: WEBHOOK_EMITTER, useExisting: WebhookEmitterService }],
  exports: [WebhookEmitterService, WEBHOOK_EMITTER]
})
export class DeveloperEventsModule {}
