import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { DeveloperTiersController } from './developer-tiers.controller';
import { DeveloperController } from './developer.controller';
import { ApiKeysWriterService } from './services/api-keys-writer.service';
import { ApiTierReaderService } from './services/api-tier-reader.service';
import { ApiTierSyncService } from './services/api-tier-sync.service';
import { ApiUsageReaderService } from './services/api-usage-reader.service';
import { HostLookupService } from './services/host-lookup.service';
import { WebhookEndpointsWriterService } from './services/webhook-endpoints-writer.service';

@Module({
  imports: [BillingCoreModule],
  controllers: [DeveloperController, DeveloperTiersController],
  providers: [
    HostLookupService,
    ApiTierReaderService,
    ApiTierSyncService,
    ApiKeysWriterService,
    ApiUsageReaderService,
    WebhookEndpointsWriterService
  ],
  exports: [ApiKeysWriterService]
})
export class DeveloperModule {}
