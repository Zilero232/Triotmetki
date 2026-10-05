import { Module } from '@nestjs/common';

import { HttpModule } from '../../core';
import { PlusGuard } from './guards/plus.guard';
import { yooKassaProvider } from './providers/yookassa.provider';
import { EntitlementsBusService } from './services/entitlements-bus.service';
import { EntitlementsService } from './services/entitlements.service';
import { PromoService } from './services/promo.service';
import { ReferralService } from './services/referral.service';
import { SubscriptionService } from './services/subscription.service';
import { WebhookService } from './services/webhook.service';

@Module({
  imports: [HttpModule],
  providers: [
    yooKassaProvider,
    EntitlementsBusService,
    SubscriptionService,
    EntitlementsService,
    PromoService,
    ReferralService,
    WebhookService,
    PlusGuard
  ],
  exports: [
    yooKassaProvider,
    EntitlementsBusService,
    SubscriptionService,
    EntitlementsService,
    PromoService,
    ReferralService,
    WebhookService,
    PlusGuard
  ]
})
export class BillingCoreModule {}
