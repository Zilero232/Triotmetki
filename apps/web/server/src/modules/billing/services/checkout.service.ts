import type { CheckoutResult } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { CheckoutInput, ReleasePromoInput } from '../billing.types';

import { AppBadRequestException, AppForbiddenException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { BILLING_LINKS, PLUS_SUBSCRIPTION } from '../config';
import { checkoutIdempotenceKey, describePlan, planPrice, YooKassaClient } from '../lib';
import { PromoService } from './promo.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly yookassa: YooKassaClient,
    private readonly promos: PromoService,
    private readonly subscriptions: SubscriptionService
  ) {}

  async createCheckout({ userId, plan, promoCode }: CheckoutInput): Promise<CheckoutResult> {
    if (!this.subscriptions.isCheckoutEnabled) {
      throw new AppForbiddenException('CHECKOUT_UNAVAILABLE', 'Paid checkout is not open yet');
    }

    if (!this.yookassa.isConfigured) {
      throw new AppForbiddenException('CHECKOUT_UNAVAILABLE', 'Payments are not configured on this server');
    }

    const promo = promoCode ? await this.promos.usable({ userId, code: promoCode }) : null;

    if (promo && !promo.discountPercent) {
      throw new AppBadRequestException('PROMO_REDEEM_ONLY', 'This promo code grants free days, redeem it without a payment');
    }

    const amountRub = planPrice({ plan, discountPercent: promo?.discountPercent ?? null });

    if (promo) {
      await this.promos.reserve({ userId, code: promo.code });
    }

    const payment = await this.yookassa
      .createPayment({
        amountRub,
        description: describePlan({ plan, isRenewal: false }),
        returnUrl: new URL(BILLING_LINKS.returnPath, this.config.get('WEB_URL')).href,
        idempotenceKey: checkoutIdempotenceKey({ userId, plan, promoCode: promo?.code, now: new Date() }),
        savePaymentMethod: this.subscriptions.isRecurringEnabled,
        metadata: { userId, plan, product: PLUS_SUBSCRIPTION.product }
      })
      .catch(async (error: unknown) => {
        await this.releasePromo({ userId, code: promo?.code });

        throw error;
      });

    const confirmationUrl = payment.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      await this.releasePromo({ userId, code: promo?.code });

      throw new AppBadRequestException('PAYMENT_FAILED', 'YooKassa returned no confirmation URL');
    }

    await this.prisma.payment.upsert({
      where: { yookassaPaymentId: payment.id },
      update: {},
      create: {
        userId,
        yookassaPaymentId: payment.id,
        amount: amountRub,
        status: 'pending',
        plan,
        promoCode: promo?.code ?? null
      }
    });

    return { confirmationUrl, paymentId: payment.id };
  }

  private async releasePromo({ userId, code }: ReleasePromoInput): Promise<void> {
    if (code) {
      await this.promos.release({ db: this.prisma, userId, code });
    }
  }
}
