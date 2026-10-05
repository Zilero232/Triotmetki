import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BillingCoreModule } from './billing-core.module';
import { BILLING_QUEUE } from './config/queue.constants';
import { BillingSchedulesService } from './processors/billing-schedules.service';
import { BillingProcessor } from './processors/billing.processor';
import { RenewalService } from './services/renewal.service';

@Module({
  imports: [BillingCoreModule, BullModule.registerQueue({ name: BILLING_QUEUE.name })],
  providers: [RenewalService, BillingProcessor, BillingSchedulesService]
})
export class BillingWorkerModule {}
