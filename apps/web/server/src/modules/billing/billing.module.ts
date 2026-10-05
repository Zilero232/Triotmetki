import { Module } from '@nestjs/common';

import { BillingCoreModule } from './billing-core.module';
import { BillingController } from './billing.controller';
import { WebhookIpGuard } from './guards/webhook-ip.guard';
import { CheckoutWriterService } from './services/checkout-writer.service';
import { TrialWriterService } from './services/trial-writer.service';

@Module({
  imports: [BillingCoreModule],
  controllers: [BillingController],
  providers: [CheckoutWriterService, TrialWriterService, WebhookIpGuard],
  exports: [BillingCoreModule]
})
export class BillingModule {}
