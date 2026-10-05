import { Injectable, Logger } from '@nestjs/common';

import type { Payment, Subscription } from '../../../../generated';
import type {
  ActivatePaidInput,
  FullRefundInput,
  RevokeRefundedInput,
  RevokeRefundInput,
  SettledPayment,
  SubscriptionPaidLastInput,
  SucceedPaymentInput
} from '../billing.types';
import type { YooKassaWebhook } from '../lib/yookassa/yookassa.types';

import { Prisma } from '../../../../generated';
import { AppNotFoundException } from '../../../common/exceptions';
import { lockedTransaction, PrismaService } from '../../../core';
import { PLUS_PLANS } from '../config/plans.constants';
import { SUBSCRIPTION_LOCK } from '../config/subscription-lock.constants';
import { revokePeriod } from '../lib/period/period';
import { storedPlan } from '../lib/pricing/pricing';
import { describeCard } from '../lib/yookassa/yookassa';
import { YooKassaClient } from '../lib/yookassa/yookassa.client';
import { EntitlementsService } from './entitlements.service';
import { PromoWriterService } from './promo-writer.service';
import { ReferralWriterService } from './referral-writer.service';
import { SubscriptionWriterService } from './subscription-writer.service';

@Injectable()
export class SettlementWriterService {
  private readonly logger = new Logger(SettlementWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yookassa: YooKassaClient,
    private readonly subscriptions: SubscriptionWriterService,
    private readonly entitlements: EntitlementsService,
    private readonly promos: PromoWriterService,
    private readonly referrals: ReferralWriterService
  ) {}

  async handle(event: YooKassaWebhook): Promise<void> {
    if (!this.yookassa.isConfigured) {
      throw new AppNotFoundException('INTEGRATION_UNAVAILABLE', 'Payments are not configured on this server');
    }

    if (event.event.startsWith('refund.')) {
      if (event.object.payment_id) {
        await this.refund({ paymentId: event.object.payment_id, now: new Date() });
      }

      return;
    }

    await this.settle(event.object.id);
  }

  async refund({ paymentId, now }: RevokeRefundInput): Promise<boolean> {
    const row = await this.prisma.payment.findUnique({ where: { yookassaPaymentId: paymentId } });

    if (!row || row.status !== 'succeeded') {
      return false;
    }

    if (!(await this.isFullyRefunded({ paymentId, row }))) {
      return false;
    }

    const isRefunded = await lockedTransaction({
      prisma: this.prisma,
      scope: SUBSCRIPTION_LOCK.scope,
      key: row.userId,
      run: async (tx) => this.revokeRefunded({ tx, row, now })
    });

    if (isRefunded) {
      await this.entitlements.syncTracking(row.userId);
      this.logger.log(`payment ${paymentId} refunded for ${row.userId}`);
    }

    return isRefunded;
  }

  async settle(paymentId: string): Promise<boolean> {
    const row = await this.pendingPayment(paymentId);

    if (!row) {
      return false;
    }

    const remote = await this.yookassa.getPayment(paymentId);

    if (remote.status === 'canceled') {
      await this.cancel(row);

      return false;
    }

    if (remote.status !== 'succeeded') {
      return false;
    }

    return this.succeed({ row, remote });
  }

  private async isFullyRefunded({ paymentId, row }: FullRefundInput): Promise<boolean> {
    const remote = await this.yookassa.getPayment(paymentId);

    if (new Prisma.Decimal(remote.refunded_amount?.value ?? 0).lessThan(row.amount)) {
      this.logger.warn(`payment ${paymentId} partially refunded (${remote.refunded_amount?.value ?? 0} of ${row.amount.toString()}), access kept`);

      return false;
    }

    return true;
  }

  private async revokeRefunded({ tx, row, now }: RevokeRefundedInput): Promise<boolean> {
    const claimed = await tx.payment.updateMany({ where: { id: row.id, status: 'succeeded' }, data: { status: 'refunded' } });

    if (claimed.count === 0) {
      return false;
    }

    const subscription = await this.subscriptionPaidLastBy({ tx, row });

    if (subscription?.currentPeriodEnd) {
      const revoked = revokePeriod({ currentPeriodEnd: subscription.currentPeriodEnd, now, months: PLUS_PLANS[storedPlan(row.plan)].months });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: revoked.isExpired
          ? { currentPeriodEnd: revoked.currentPeriodEnd, status: 'expired', cancelAtPeriodEnd: true }
          : { currentPeriodEnd: revoked.currentPeriodEnd }
      });
    }

    return true;
  }

  private async subscriptionPaidLastBy({ tx, row }: SubscriptionPaidLastInput): Promise<Subscription | null> {
    if (!row.subscriptionId) {
      return null;
    }

    const latest = await tx.payment.findFirst({
      where: { subscriptionId: row.subscriptionId, status: { in: ['succeeded', 'refunded'] } },
      orderBy: { paidAt: 'desc' },
      select: { id: true }
    });

    return latest?.id === row.id ? tx.subscription.findUnique({ where: { id: row.subscriptionId } }) : null;
  }

  private async pendingPayment(paymentId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { yookassaPaymentId: paymentId } });

    if (!row) {
      this.logger.warn(`webhook for an unknown payment ${paymentId}`);

      return null;
    }

    return row.status === 'pending' ? row : null;
  }

  private async cancel(row: Payment): Promise<void> {
    await this.prisma.payment.updateMany({ where: { id: row.id, status: 'pending' }, data: { status: 'canceled' } });

    if (row.promoCode) {
      await this.promos.release({ db: this.prisma, userId: row.userId, code: row.promoCode });
    }

    if (row.isAutoCharge && row.subscriptionId) {
      await this.prisma.subscription.update({ where: { id: row.subscriptionId }, data: { status: 'pastDue' } });
      this.entitlements.invalidate(row.userId);
    }
  }

  private async succeed({ row, remote }: SucceedPaymentInput): Promise<boolean> {
    const now = new Date();
    const method = remote.payment_method?.saved ? { id: remote.payment_method.id, title: describeCard(remote.payment_method) } : null;

    const settled = await lockedTransaction({
      prisma: this.prisma,
      scope: SUBSCRIPTION_LOCK.scope,
      key: row.userId,
      run: async (tx) => this.activatePaid({ tx, row, method, now })
    });

    if (!settled) {
      return false;
    }

    await this.entitlements.syncTracking(row.userId);

    if (settled.referrer) {
      await this.entitlements.syncTracking(settled.referrer);
    }

    this.logger.log(`payment ${row.yookassaPaymentId} settled for ${row.userId}`);

    return true;
  }

  private async activatePaid({ tx, row, method, now }: ActivatePaidInput): Promise<SettledPayment | null> {
    const claimed = await tx.payment.updateMany({ where: { id: row.id, status: 'pending' }, data: { status: 'succeeded', paidAt: now } });

    if (claimed.count === 0) {
      return null;
    }

    const subscriptionId = await this.subscriptions.activate({ db: tx, userId: row.userId, plan: storedPlan(row.plan), method, now });

    await tx.payment.update({ where: { id: row.id }, data: { subscriptionId } });

    if (row.promoCode) {
      await this.promos.confirm({ db: tx, userId: row.userId, code: row.promoCode });
    }

    return { referrer: await this.referrals.reward({ db: tx, userId: row.userId, now }) };
  }
}
