import type { BillingStatus, PaymentHistoryItem, PlanOffer } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { isPlusState, PLUS } from '@otmetki/schemas';

import type { ActivateInput, ActivationInput, GrantDaysInput, SetAutoRenewInput } from '../billing.types';

import { AppBadRequestException } from '../../../common/exceptions';
import { toIso } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { PLUS_PLANS } from '../config/plans.constants';
import { isEntitled } from '../lib/entitlement/entitlement';
import { PLUS_SUBSCRIPTION } from '../lib/entitlement/entitlement.constants';
import { cancelsAtPeriodEnd, extendPeriod } from '../lib/period/period';
import { plusSubscriptionKey } from '../lib/subscription-key/subscription-key';
import { toPaymentHistoryItem } from '../mappers/payment.mappers';
import { EntitlementsService } from './entitlements.service';

@Injectable()
export class SubscriptionWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly entitlements: EntitlementsService
  ) {}

  get isRecurringEnabled(): boolean {
    return this.config.get('YOOKASSA_RECURRING');
  }

  get isCheckoutEnabled(): boolean {
    return PLUS.checkoutEnabled;
  }

  async activate({ db, userId, plan, method, now }: ActivateInput): Promise<string> {
    const current = await db.subscription.findUnique({ where: plusSubscriptionKey(userId) });
    const data = this.activation({ current, plan, method, now });

    const subscription = await db.subscription.upsert({
      where: plusSubscriptionKey(userId),
      create: { userId, product: PLUS_SUBSCRIPTION.product, ...data },
      update: data,
      select: { id: true }
    });

    return subscription.id;
  }

  async grantDays({ db, userId, days, now }: GrantDaysInput): Promise<void> {
    const current = await db.subscription.findUnique({ where: plusSubscriptionKey(userId) });
    const isRunning = isEntitled({ subscription: current, now });
    const currentPeriodEnd = extendPeriod({ currentPeriodEnd: isRunning ? (current?.currentPeriodEnd ?? null) : null, now, days });

    await db.subscription.upsert({
      where: plusSubscriptionKey(userId),
      create: { userId, product: PLUS_SUBSCRIPTION.product, status: 'active', currentPeriodEnd, cancelAtPeriodEnd: true },
      update: { currentPeriodEnd, ...(isRunning ? {} : { status: 'active' as const, cancelAtPeriodEnd: true }) }
    });
  }

  private activation({ current, plan, method, now }: ActivationInput) {
    const isRunning = isEntitled({ subscription: current, now });

    return {
      plan,
      status: 'active' as const,
      currentPeriodEnd: extendPeriod({
        currentPeriodEnd: isRunning ? (current?.currentPeriodEnd ?? null) : null,
        now,
        months: PLUS_PLANS[plan].months
      }),
      cancelAtPeriodEnd: cancelsAtPeriodEnd({
        isRecurringEnabled: this.isRecurringEnabled,
        hasMethod: Boolean(method?.id ?? current?.savedCardId),
        wasCancelled: isRunning && (current?.cancelAtPeriodEnd ?? false)
      }),
      ...(method ? { savedCardId: method.id, savedCardTitle: method.title } : {})
    };
  }

  async status(userId: string): Promise<BillingStatus> {
    const [subscription, plus] = await Promise.all([
      this.prisma.subscription.findUnique({ where: plusSubscriptionKey(userId) }),
      this.entitlements.refresh(userId)
    ]);

    return {
      isPlus: isPlusState(plus.state),
      plan: subscription?.plan ?? null,
      status: subscription?.status ?? null,
      currentPeriodEnd: toIso(subscription?.currentPeriodEnd),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      card: subscription?.savedCardTitle ?? null,
      isRecurringAvailable: this.isRecurringEnabled,
      isCheckoutAvailable: this.isCheckoutEnabled,
      plus,
      plans: this.plans()
    };
  }

  plans(): PlanOffer[] {
    return Object.values(PLUS_PLANS).map(({ plan, months, priceRub }) => ({ plan, months, priceRub }));
  }

  async history(userId: string): Promise<PaymentHistoryItem[]> {
    const payments = await this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    return payments.map(toPaymentHistoryItem);
  }

  async setAutoRenew({ userId, isEnabled }: SetAutoRenewInput): Promise<BillingStatus> {
    const subscription = await this.prisma.subscription.findUnique({ where: plusSubscriptionKey(userId) });

    if (!subscription) {
      throw new AppBadRequestException('SUBSCRIPTION_REQUIRED', 'There is no Plus subscription to change');
    }

    if (isEnabled && (!this.isRecurringEnabled || !subscription.savedCardId)) {
      throw new AppBadRequestException('PAYMENT_REQUIRED', 'Auto-renewal needs a saved card');
    }

    await this.prisma.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: !isEnabled } });

    return this.status(userId);
  }
}
