import { Module } from '@nestjs/common';

import { BillingCoreModule } from './billing-core.module';
import { BillingController } from './billing.controller';
import { WebhookIpGuard } from './guards/webhook-ip.guard';
import { CheckoutService } from './services/checkout.service';
import { TrialService } from './services/trial.service';

@Module({
  imports: [BillingCoreModule],
  controllers: [BillingController],
  providers: [CheckoutService, TrialService, WebhookIpGuard],
  exports: [BillingCoreModule]
})
export class BillingModule {}
