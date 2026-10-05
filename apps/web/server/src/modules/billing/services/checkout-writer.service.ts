import type { CheckoutResult } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { PromoCode } from '../../../../generated';
import type { CheckoutInput, PromoCodeInput, RecordPendingInput, ReleasePromoInput, RequestPaymentInput } from '../billing.types';
import type { YooKassaPayment } from '../lib/yookassa/yookassa.types';

import { AppBadRequestException, AppForbiddenException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { BILLING_LINKS } from '../config/plans.constants';
import { PLUS_SUBSCRIPTION } from '../lib/entitlement/entitlement.constants';
import { describePlan, planPrice } from '../lib/pricing/pricing';
import { checkoutIdempotenceKey } from '../lib/yookassa/yookassa';
import { YooKassaClient } from '../lib/yookassa/yookassa.client';
import { PromoWriterService } from './promo-writer.service';
import { SubscriptionWriterService } from './subscription-writer.service';

@Injectable()
export class CheckoutWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly yookassa: YooKassaClient,
    private readonly promos: PromoWriterService,
    private readonly subscriptions: SubscriptionWriterService
  ) {}

  async createCheckout({ userId, plan, promoCode }: CheckoutInput): Promise<CheckoutResult> {
    this.assertCheckoutOpen();

    const promo = promoCode ? await this.discountPromo({ userId, code: promoCode }) : null;
    const amountRub = planPrice({ plan, discountPercent: promo?.discountPercent ?? null });

    if (promo) {
      await this.promos.reserve({ userId, code: promo.code });
    }

    const payment = await this.requestPayment({ userId, plan, amountRub, promoCode: promo?.code });
    const confirmationUrl = payment.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      await this.releasePromo({ userId, code: promo?.code });

      throw new AppBadRequestException('PAYMENT_FAILED', 'YooKassa returned no confirmation URL');
    }

    await this.recordPending({ userId, plan, amountRub, paymentId: payment.id, promoCode: promo?.code ?? null });

    return { confirmationUrl, paymentId: payment.id };
  }

  private assertCheckoutOpen(): void {
    if (!this.subscriptions.isCheckoutEnabled) {
      throw new AppForbiddenException('CHECKOUT_UNAVAILABLE', 'Paid checkout is not open yet');
    }

    if (!this.yookassa.isConfigured) {
      throw new AppForbiddenException('CHECKOUT_UNAVAILABLE', 'Payments are not configured on this server');
    }
  }

  private async discountPromo({ userId, code }: PromoCodeInput): Promise<PromoCode> {
    const promo = await this.promos.usable({ userId, code });

    if (!promo.discountPercent) {
      throw new AppBadRequestException('PROMO_REDEEM_ONLY', 'This promo code grants free days, redeem it without a payment');
    }

    return promo;
  }

  private requestPayment({ userId, plan, amountRub, promoCode }: RequestPaymentInput): Promise<YooKassaPayment> {
    return this.yookassa
      .createPayment({
        amountRub,
        description: describePlan({ plan, isRenewal: false }),
        returnUrl: new URL(BILLING_LINKS.returnPath, this.config.get('WEB_URL')).href,
        idempotenceKey: checkoutIdempotenceKey({ userId, plan, promoCode, now: new Date() }),
        savePaymentMethod: this.subscriptions.isRecurringEnabled,
        metadata: { userId, plan, product: PLUS_SUBSCRIPTION.product }
      })
      .catch(async (error: unknown) => {
        await this.releasePromo({ userId, code: promoCode });

        throw error;
      });
  }

  private async recordPending({ userId, plan, amountRub, paymentId, promoCode }: RecordPendingInput): Promise<void> {
    await this.prisma.payment.upsert({
      where: { yookassaPaymentId: paymentId },
      update: {},
      create: { userId, yookassaPaymentId: paymentId, amount: amountRub, status: 'pending', plan, promoCode }
    });
  }

  private async releasePromo({ userId, code }: ReleasePromoInput): Promise<void> {
    if (code) {
      await this.promos.release({ db: this.prisma, userId, code });
    }
  }
}
