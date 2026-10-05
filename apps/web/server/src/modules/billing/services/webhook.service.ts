import { Injectable, Logger } from '@nestjs/common';

import type { RevokeRefundInput } from '../billing.types';
import type { YooKassaWebhook } from '../lib';

import { Prisma } from '../../../../generated';
import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { PLUS_PLANS } from '../config';
import { describeCard, revokePeriod, storedPlan, YooKassaClient } from '../lib';
import { EntitlementsService } from './entitlements.service';
import { PromoService } from './promo.service';
import { ReferralService } from './referral.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yookassa: YooKassaClient,
    private readonly subscriptions: SubscriptionService,
    private readonly entitlements: EntitlementsService,
    private readonly promos: PromoService,
    private readonly referrals: ReferralService
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

    const remote = await this.yookassa.getPayment(paymentId);

    if (new Prisma.Decimal(remote.refunded_amount?.value ?? 0).lessThan(row.amount)) {
      this.logger.warn(`payment ${paymentId} partially refunded (${remote.refunded_amount?.value ?? 0} of ${row.amount.toString()}), access kept`);

      return false;
    }

    const plan = storedPlan(row.plan);

    const isRefunded = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({ where: { id: row.id, status: 'succeeded' }, data: { status: 'refunded' } });

      if (claimed.count === 0) {
        return false;
      }

      const latest = row.subscriptionId
        ? await tx.payment.findFirst({
            where: { subscriptionId: row.subscriptionId, status: { in: ['succeeded', 'refunded'] } },
            orderBy: { paidAt: 'desc' },
            select: { id: true }
          })
        : null;

      const subscription =
        latest?.id === row.id && row.subscriptionId ? await tx.subscription.findUnique({ where: { id: row.subscriptionId } }) : null;

      if (subscription?.currentPeriodEnd) {
        const revoked = revokePeriod({ currentPeriodEnd: subscription.currentPeriodEnd, now, months: PLUS_PLANS[plan].months });

        await tx.subscription.update({
          where: { id: subscription.id },
          data: revoked.isExpired
            ? { currentPeriodEnd: revoked.currentPeriodEnd, status: 'expired', cancelAtPeriodEnd: true }
            : { currentPeriodEnd: revoked.currentPeriodEnd }
        });
      }

      return true;
    });

    if (isRefunded) {
      await this.entitlements.syncTracking(row.userId);
      this.logger.log(`payment ${paymentId} refunded for ${row.userId}`);
    }

    return isRefunded;
  }

  async settle(paymentId: string): Promise<boolean> {
    const row = await this.prisma.payment.findUnique({ where: { yookassaPaymentId: paymentId } });

    if (!row) {
      this.logger.warn(`webhook for an unknown payment ${paymentId}`);

      return false;
    }

    if (row.status !== 'pending') {
      return false;
    }

    const remote = await this.yookassa.getPayment(paymentId);

    if (remote.status === 'canceled') {
      await this.prisma.payment.updateMany({ where: { id: row.id, status: 'pending' }, data: { status: 'canceled' } });

      if (row.promoCode) {
        await this.promos.release({ db: this.prisma, userId: row.userId, code: row.promoCode });
      }

      if (row.isAutoCharge && row.subscriptionId) {
        await this.prisma.subscription.update({ where: { id: row.subscriptionId }, data: { status: 'pastDue' } });
        this.entitlements.invalidate(row.userId);
      }

      return false;
    }

    if (remote.status !== 'succeeded') {
      return false;
    }

    const now = new Date();
    const plan = storedPlan(row.plan);
    const method = remote.payment_method?.saved ? { id: remote.payment_method.id, title: describeCard(remote.payment_method) } : null;

    const settled = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.payment.updateMany({ where: { id: row.id, status: 'pending' }, data: { status: 'succeeded', paidAt: now } });

        if (claimed.count === 0) {
          return null;
        }

        const subscriptionId = await this.subscriptions.activate({ db: tx, userId: row.userId, plan, method, now });

        await tx.payment.update({ where: { id: row.id }, data: { subscriptionId } });

        if (row.promoCode) {
          await this.promos.confirm({ db: tx, userId: row.userId, code: row.promoCode });
        }

        return { referrer: await this.referrals.reward({ db: tx, userId: row.userId, now }) };
      },
      { isolationLevel: 'Serializable' }
    );

    if (!settled) {
      return false;
    }

    await this.entitlements.syncTracking(row.userId);

    if (settled.referrer) {
      await this.entitlements.syncTracking(settled.referrer);
    }

    this.logger.log(`payment ${paymentId} settled for ${row.userId}`);

    return true;
  }
}
