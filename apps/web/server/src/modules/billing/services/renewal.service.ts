import { Injectable, Logger } from '@nestjs/common';
import { addHours, subDays } from 'date-fns';

import type { Subscription } from '../../../../generated';
import type { RecordPendingChargeInput } from '../billing.types';

import { errorMessage, PLUS_SUBSCRIPTION } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { RENEWAL } from '../config/renewal.constants';
import { renewalIdempotenceKey } from '../lib/period';
import { describePlan, planPrice, storedPlan } from '../lib/pricing';
import { YooKassaClient } from '../lib/yookassa';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionService } from './subscription.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yookassa: YooKassaClient,
    private readonly subscriptions: SubscriptionService,
    private readonly webhooks: WebhookService,
    private readonly entitlements: EntitlementsService
  ) {}

  async chargeDue(now = new Date()): Promise<number> {
    if (!this.subscriptions.isCheckoutEnabled || !this.subscriptions.isRecurringEnabled || !this.yookassa.isConfigured) {
      return 0;
    }

    let charged = 0;

    for (const subscription of await this.dueWithoutPendingCharge(now)) {
      try {
        charged += (await this.charge(subscription)) ? 1 : 0;
      } catch (error) {
        this.logger.warn(`renewal of ${subscription.id} failed: ${errorMessage(error)}`);
        await this.prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'pastDue' } });
      }
    }

    return charged;
  }

  async expireDue(now = new Date()): Promise<number> {
    const lapsedWhere = {
      status: { in: [...PLUS_SUBSCRIPTION.runningStatuses] },
      currentPeriodEnd: { lt: now },
      OR: [{ cancelAtPeriodEnd: true }, { savedCardId: null }]
    };

    const overdueWhere = { status: 'pastDue' as const, currentPeriodEnd: { lt: subDays(now, RENEWAL.pastDueGraceDays) } };

    const ending = await this.prisma.subscription.findMany({ where: { OR: [lapsedWhere, overdueWhere] }, select: { userId: true } });

    const [lapsed, overdue, unpaid] = await this.prisma.$transaction([
      this.prisma.subscription.updateMany({ where: lapsedWhere, data: { status: 'expired' } }),
      this.prisma.subscription.updateMany({ where: overdueWhere, data: { status: 'expired' } }),
      this.prisma.subscription.updateMany({
        where: { status: 'active', currentPeriodEnd: { lt: now }, cancelAtPeriodEnd: false, savedCardId: { not: null } },
        data: { status: 'pastDue' }
      })
    ]);

    for (const { userId } of ending) {
      await this.entitlements.syncTracking(userId);
    }

    return lapsed.count + overdue.count + unpaid.count;
  }

  private async dueWithoutPendingCharge(now: Date): Promise<Subscription[]> {
    const due = await this.prisma.subscription.findMany({
      where: {
        product: PLUS_SUBSCRIPTION.product,
        status: { in: ['active', 'pastDue'] },
        cancelAtPeriodEnd: false,
        savedCardId: { not: null },
        currentPeriodEnd: { lte: addHours(now, RENEWAL.leadHours), gt: subDays(now, RENEWAL.pastDueGraceDays) }
      },
      take: RENEWAL.batchSize
    });

    const pending = await this.prisma.payment.findMany({
      where: { subscriptionId: { in: due.map((subscription) => subscription.id) }, isAutoCharge: true, status: 'pending' },
      select: { subscriptionId: true },
      distinct: ['subscriptionId']
    });

    const awaiting = new Set(pending.map((payment) => payment.subscriptionId));

    return due.filter((candidate) => !awaiting.has(candidate.id));
  }

  private async charge(subscription: Subscription): Promise<boolean> {
    if (!subscription.savedCardId || !subscription.currentPeriodEnd) {
      return false;
    }

    const plan = storedPlan(subscription.plan);
    const amountRub = planPrice({ plan, discountPercent: null });

    const payment = await this.yookassa.chargeSavedMethod({
      amountRub,
      description: describePlan({ plan, isRenewal: true }),
      paymentMethodId: subscription.savedCardId,
      idempotenceKey: renewalIdempotenceKey({ subscriptionId: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd }),
      metadata: { userId: subscription.userId, plan, product: PLUS_SUBSCRIPTION.product, subscriptionId: subscription.id }
    });

    await this.recordPendingCharge({ subscription, paymentId: payment.id, plan, amountRub });

    return payment.status === 'pending' ? true : this.webhooks.settle(payment.id);
  }

  private async recordPendingCharge({ subscription, paymentId, plan, amountRub }: RecordPendingChargeInput): Promise<void> {
    await this.prisma.payment.upsert({
      where: { yookassaPaymentId: paymentId },
      create: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        yookassaPaymentId: paymentId,
        amount: amountRub,
        status: 'pending',
        plan,
        isAutoCharge: true
      },
      update: {}
    });
  }
}
