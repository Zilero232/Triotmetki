import { REFERRAL } from '@otmetki/schemas';
import { addDays, addMinutes, addMonths } from 'date-fns';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { YooKassaPayment } from '../../lib/yookassa/yookassa.types';

import { lockedTransaction } from '../../../../core';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { PLUS_PLANS } from '../../config/plans.constants';
import { SUBSCRIPTION_LOCK } from '../../config/subscription-lock.constants';
import { BILLING_DB_TABLES, createBillingServices, seedUser } from './billing-db.fixtures';

const NOW = new Date('2026-10-05T12:00:00.000Z');
const PAYMENT_ID = 'yk-1';
const CODE = 'SPRING';
const GIFT_CODE = 'GIFT';

const remote = (status: YooKassaPayment['status'], extra: Partial<YooKassaPayment> = {}): YooKassaPayment => ({
  id: PAYMENT_ID,
  status,
  amount: { value: '1990.00', currency: 'RUB' },
  ...extra
});

const savedCard = { payment_method: { id: 'card-1', saved: true, card: { last4: '4242', card_type: 'Visa' } } };

describeWithDatabase('SettlementWriterService against the database', () => {
  const prisma = createTestPrisma();
  const { payments, yookassa, promos, subscriptions } = createBillingServices(prisma);

  const seedPayment = (data: { plan?: 'monthly' | 'yearly'; promoCode?: string; isAutoCharge?: boolean; subscriptionId?: string } = {}) =>
    prisma.payment.create({ data: { userId: 'u1', yookassaPaymentId: PAYMENT_ID, amount: PLUS_PLANS.yearly.priceRub, plan: 'yearly', ...data } });

  const payment = () => prisma.payment.findUniqueOrThrow({ where: { yookassaPaymentId: PAYMENT_ID } });
  const subscriptionOf = (userId: string) => prisma.subscription.findFirst({ where: { userId } });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    await truncateTables({ prisma, tables: [...BILLING_DB_TABLES] });
    await Promise.all(['u1', 'referrer'].map((id) => seedUser(prisma, id)));
    yookassa.getPayment.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('settle', () => {
    it('marks the payment succeeded, activates the plan and links the payment to it', async () => {
      await seedPayment();
      yookassa.getPayment.mockResolvedValue(remote('succeeded', savedCard));

      await expect(payments.settle(PAYMENT_ID)).resolves.toBe(true);

      const subscription = await subscriptionOf('u1');

      expect(await payment()).toMatchObject({ status: 'succeeded', paidAt: NOW, subscriptionId: subscription?.id });
      expect(subscription).toMatchObject({ status: 'active', plan: 'yearly', currentPeriodEnd: addMonths(NOW, PLUS_PLANS.yearly.months) });
      expect(subscription).toMatchObject({ savedCardId: 'card-1', savedCardTitle: 'Visa •••• 4242', cancelAtPeriodEnd: false });
    });

    it('settles a repeated webhook once', async () => {
      await seedPayment();
      yookassa.getPayment.mockResolvedValue(remote('succeeded'));
      await payments.settle(PAYMENT_ID);

      await expect(payments.settle(PAYMENT_ID)).resolves.toBe(false);

      expect((await subscriptionOf('u1'))?.currentPeriodEnd).toEqual(addMonths(NOW, PLUS_PLANS.yearly.months));
    });

    describe('concurrently, on the real clock', () => {
      beforeEach(() => {
        vi.useRealTimers();
      });

      it('extends the period once when two webhooks for the payment arrive together', async () => {
        await seedPayment();
        yookassa.getPayment.mockResolvedValue(remote('succeeded'));

        const results = await Promise.all([payments.settle(PAYMENT_ID), payments.settle(PAYMENT_ID)]);

        expect(results.toSorted()).toEqual([false, true]);
        expect((await subscriptionOf('u1'))?.currentPeriodEnd).toEqual(addMonths((await payment()).paidAt ?? NOW, PLUS_PLANS.yearly.months));
      });

      it('keeps the free days redeemed while a payment activates the plan', async () => {
        const periodEnd = addDays(new Date(), 10);
        let redeemed: Promise<void> = Promise.resolve();

        await prisma.subscription.create({
          data: { userId: 'u1', product: 'plus', status: 'active', currentPeriodEnd: periodEnd, cancelAtPeriodEnd: true }
        });

        await prisma.promoCode.create({ data: { code: GIFT_CODE, freeDays: 1 } });

        await lockedTransaction({
          prisma,
          scope: SUBSCRIPTION_LOCK.scope,
          key: 'u1',
          run: async (tx) => {
            await subscriptions.activate({ db: tx, userId: 'u1', plan: 'monthly', method: null, now: new Date() });
            redeemed = promos.redeemFreeDays({ userId: 'u1', code: GIFT_CODE });
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        });

        await redeemed;

        expect((await subscriptionOf('u1'))?.currentPeriodEnd).toEqual(addDays(addMonths(periodEnd, 1), 1));
      });
    });

    it('leaves a payment still pending at YooKassa untouched', async () => {
      await seedPayment();
      yookassa.getPayment.mockResolvedValue(remote('pending'));

      await expect(payments.settle(PAYMENT_ID)).resolves.toBe(false);

      expect((await payment()).status).toBe('pending');
      expect(await subscriptionOf('u1')).toBeNull();
    });

    it('ignores a payment it never created', async () => {
      await expect(payments.settle(PAYMENT_ID)).resolves.toBe(false);

      expect(yookassa.getPayment).not.toHaveBeenCalled();
    });

    it('turns the promo reservation into a use', async () => {
      await prisma.promoCode.create({ data: { code: CODE, discountPercent: 20, usedCount: 1 } });
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: addMinutes(NOW, 30) } });
      await seedPayment({ promoCode: CODE });
      yookassa.getPayment.mockResolvedValue(remote('succeeded'));

      await payments.settle(PAYMENT_ID);

      expect((await prisma.promoCode.findUniqueOrThrow({ where: { code: CODE } })).usedCount).toBe(1);
      expect((await prisma.promoRedemption.findFirstOrThrow({ where: { code: CODE, userId: 'u1' } })).reservedUntil).toBeNull();
    });

    it('rewards the referrer of a first payment once', async () => {
      await prisma.referral.create({ data: { referredUserId: 'u1', referrerUserId: 'referrer' } });
      await seedPayment();
      yookassa.getPayment.mockResolvedValue(remote('succeeded'));

      await payments.settle(PAYMENT_ID);

      expect((await subscriptionOf('referrer'))?.currentPeriodEnd).toEqual(addDays(NOW, REFERRAL.bonusDays));
      expect((await prisma.referral.findUniqueOrThrow({ where: { referredUserId: 'u1' } })).rewardedAt).toEqual(NOW);
    });

    it('cancels the payment and gives the reserved promo use back', async () => {
      await prisma.promoCode.create({ data: { code: CODE, discountPercent: 20, usedCount: 1 } });
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: addMinutes(NOW, 30) } });
      await seedPayment({ promoCode: CODE });
      yookassa.getPayment.mockResolvedValue(remote('canceled'));

      await expect(payments.settle(PAYMENT_ID)).resolves.toBe(false);

      expect((await payment()).status).toBe('canceled');
      expect((await prisma.promoCode.findUniqueOrThrow({ where: { code: CODE } })).usedCount).toBe(0);
      expect(await prisma.promoRedemption.count()).toBe(0);
    });

    it('marks the subscription past due when a renewal charge is cancelled', async () => {
      const subscription = await prisma.subscription.create({
        data: { userId: 'u1', product: 'plus', status: 'active', currentPeriodEnd: addDays(NOW, 1), savedCardId: 'card-1' }
      });

      await seedPayment({ isAutoCharge: true, subscriptionId: subscription.id });
      yookassa.getPayment.mockResolvedValue(remote('canceled'));

      await payments.settle(PAYMENT_ID);

      expect((await subscriptionOf('u1'))?.status).toBe('pastDue');
    });
  });

  describe('refund', () => {
    const settledYearly = async () => {
      await seedPayment();
      yookassa.getPayment.mockResolvedValue(remote('succeeded'));
      await payments.settle(PAYMENT_ID);
    };

    it('takes the refunded months back from the period', async () => {
      await settledYearly();
      yookassa.getPayment.mockResolvedValue(remote('succeeded', { refunded_amount: { value: '1990.00', currency: 'RUB' } }));

      await expect(payments.refund({ paymentId: PAYMENT_ID, now: NOW })).resolves.toBe(true);

      expect((await payment()).status).toBe('refunded');
      expect(await subscriptionOf('u1')).toMatchObject({ status: 'expired', currentPeriodEnd: NOW, cancelAtPeriodEnd: true });
    });

    it('keeps access after a partial refund', async () => {
      await settledYearly();
      yookassa.getPayment.mockResolvedValue(remote('succeeded', { refunded_amount: { value: '100.00', currency: 'RUB' } }));

      await expect(payments.refund({ paymentId: PAYMENT_ID, now: NOW })).resolves.toBe(false);

      expect((await payment()).status).toBe('succeeded');
      expect((await subscriptionOf('u1'))?.status).toBe('active');
    });

    it('revokes once when the refund webhook repeats', async () => {
      await settledYearly();
      yookassa.getPayment.mockResolvedValue(remote('succeeded', { refunded_amount: { value: '1990.00', currency: 'RUB' } }));
      await payments.refund({ paymentId: PAYMENT_ID, now: NOW });

      await expect(payments.refund({ paymentId: PAYMENT_ID, now: NOW })).resolves.toBe(false);
    });
  });
});
