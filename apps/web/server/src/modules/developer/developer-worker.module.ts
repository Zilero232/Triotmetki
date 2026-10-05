import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { WebhooksProcessor } from './processors/webhooks.processor';
import { ApiTierReaderService } from './services/api-tier-reader.service';
import { ApiTierSyncService } from './services/api-tier-sync.service';
import { HostLookupService } from './services/host-lookup.service';
import { SessionCloseService } from './services/session-close.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookEndpointsWriterService } from './services/webhook-endpoints-writer.service';
import { WebhookPosterService } from './services/webhook-poster.service';
import { WebhookRedriveService } from './services/webhook-redrive.service';

@Module({
  imports: [BillingCoreModule],
  providers: [
    HostLookupService,
    WebhookPosterService,
    ApiTierReaderService,
    WebhookEndpointsWriterService,
    ApiTierSyncService,
    WebhookDeliveryService,
    SessionCloseService,
    WebhookRedriveService,
    WebhooksProcessor
  ]
})
export class DeveloperWorkerModule {}
