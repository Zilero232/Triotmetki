import { Module } from '@nestjs/common';

import { HttpModule } from '../../core';
import { PlusGuard } from './guards/plus.guard';
import { yooKassaProvider } from './providers/yookassa.provider';
import { EntitlementsBusService } from './services/entitlements-bus.service';
import { EntitlementsService } from './services/entitlements.service';
import { PromoWriterService } from './services/promo-writer.service';
import { ReferralWriterService } from './services/referral-writer.service';
import { SettlementWriterService } from './services/settlement-writer.service';
import { SubscriptionWriterService } from './services/subscription-writer.service';

@Module({
  imports: [HttpModule],
  providers: [
    yooKassaProvider,
    EntitlementsBusService,
    SubscriptionWriterService,
    EntitlementsService,
    PromoWriterService,
    ReferralWriterService,
    SettlementWriterService,
    PlusGuard
  ],
  exports: [
    yooKassaProvider,
    EntitlementsBusService,
    SubscriptionWriterService,
    EntitlementsService,
    PromoWriterService,
    ReferralWriterService,
    SettlementWriterService,
    PlusGuard
  ]
})
export class BillingCoreModule {}
