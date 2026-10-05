import { addDays, addMonths } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Payment, Subscription } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { YooKassaClient, YooKassaPayment } from '../../lib';
import type { EntitlementsService } from '../entitlements.service';
import type { PromoService } from '../promo.service';
import type { ReferralService } from '../referral.service';
import type { SubscriptionService } from '../subscription.service';

import { Prisma } from '../../../../../generated';
import { PLUS_PLANS } from '../../config';
import { WebhookService } from '../webhook.service';

const NOW = new Date('2026-09-25T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const pendingPayment = mock<Payment>({
  id: 'row',
  userId: 'u1',
  status: 'pending',
  plan: 'yearly',
  promoCode: null,
  isAutoCharge: false,
  subscriptionId: null
});

const remote = (status: YooKassaPayment['status'], saved = false): YooKassaPayment => ({
  id: 'p1',
  status,
  amount: { value: '1990.00', currency: 'RUB' },
  payment_method: { id: 'card-1', saved, card: { last4: '4242', card_type: 'Visa' } }
});

const createService = ({ isConfigured = true }: { isConfigured?: boolean } = {}) => {
  const prisma = mockDeep<PrismaService>();
  const yookassa = mock<YooKassaClient>({ isConfigured });
  const subscriptions = mock<SubscriptionService>();
  const entitlements = mock<EntitlementsService>();
  const promos = mock<PromoService>();
  const referrals = mock<ReferralService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  subscriptions.activate.mockResolvedValue('sub-1');

  const service = new WebhookService(prisma, yookassa, subscriptions, entitlements, promos, referrals);

  return { service, prisma, yookassa, subscriptions, entitlements, promos, referrals };
};

const PAID = '199.00';

const createRefund = (refunded = PAID) => {
  const created = createService();

  created.yookassa.getPayment.mockResolvedValue({
    ...remote('succeeded'),
    amount: { value: PAID, currency: 'RUB' },
    refunded_amount: { value: refunded, currency: 'RUB' }
  });

  created.prisma.payment.findFirst.mockResolvedValue(mock<Payment>({ id: 'row' }));

  return created;
};

describe('WebhookService.settle', () => {
  it('ignores a payment we never created', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue(null);

    expect(await service.settle('p1')).toBe(false);
    expect(yookassa.getPayment).not.toHaveBeenCalled();
  });

  it('is idempotent for a payment already settled', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, status: 'succeeded' });

    expect(await service.settle('p1')).toBe(false);
    expect(yookassa.getPayment).not.toHaveBeenCalled();
  });

  it('trusts the re-fetched status, not the webhook body', async () => {
    const { service, prisma, yookassa, subscriptions } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    yookassa.getPayment.mockResolvedValue(remote('pending'));

    expect(await service.settle('p1')).toBe(false);
    expect(subscriptions.activate).not.toHaveBeenCalled();
  });

  it('activates the paid plan once, saves the card and rewards the referrer', async () => {
    const { service, prisma, yookassa, subscriptions, referrals, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded', true));

    expect(await service.settle('p1')).toBe(true);

    expect(subscriptions.activate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', plan: 'yearly', method: { id: 'card-1', title: 'Visa •••• 4242' } })
    );

    expect(referrals.reward).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', now: NOW }));
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'succeeded', paidAt: NOW } }));
    expect(entitlements.syncTracking).toHaveBeenCalledTimes(1);
    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('refreshes the tracking of the rewarded referrer too', async () => {
    const { service, prisma, yookassa, referrals, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));
    referrals.reward.mockResolvedValue('referrer');

    await service.settle('p1');

    expect(entitlements.syncTracking.mock.calls.map(([userId]) => userId)).toEqual(['u1', 'referrer']);
  });

  it('keeps no card that the payer did not save', async () => {
    const { service, prisma, yookassa, subscriptions } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded', false));

    await service.settle('p1');

    expect(subscriptions.activate).toHaveBeenCalledWith(expect.objectContaining({ method: null }));
  });

  it('activates the monthly plan for a payment row without a plan', async () => {
    const { service, prisma, yookassa, subscriptions } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, plan: null });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.settle('p1');

    expect(subscriptions.activate).toHaveBeenCalledWith(expect.objectContaining({ plan: PLUS_PLANS.monthly.plan }));
  });

  it('links the settled payment to the activated subscription', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.settle('p1');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: pendingPayment.id }, data: { subscriptionId: 'sub-1' } })
    );
  });

  it('does nothing when a concurrent webhook claimed the payment first', async () => {
    const { service, prisma, yookassa, subscriptions, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    expect(await service.settle('p1')).toBe(false);
    expect(subscriptions.activate).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('records the promo redemption with the payment', async () => {
    const { service, prisma, yookassa, promos } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, promoCode: 'SPRING' });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.settle('p1');

    expect(promos.confirm).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', code: 'SPRING' }));
  });

  it('gives the reserved promo use back when the payment is cancelled', async () => {
    const { service, prisma, yookassa, promos } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, promoCode: 'SPRING' });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('canceled'));

    await service.settle('p1');

    expect(promos.release).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', code: 'SPRING' }));
  });

  it('marks a failed renewal as past due', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, isAutoCharge: true, subscriptionId: 'sub-1' });
    yookassa.getPayment.mockResolvedValue(remote('canceled'));

    expect(await service.settle('p1')).toBe(false);
    expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sub-1' }, data: { status: 'pastDue' } }));
    expect(entitlements.invalidate).toHaveBeenCalledWith('u1');
  });

  it('cancels a one-off payment without touching any subscription', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    yookassa.getPayment.mockResolvedValue(remote('canceled'));

    expect(await service.settle('p1')).toBe(false);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'canceled' } }));
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(entitlements.invalidate).not.toHaveBeenCalled();
  });
});

describe('WebhookService.handle', () => {
  it('answers integration-unavailable and touches nothing while YooKassa is not configured', async () => {
    const { service, prisma } = createService({ isConfigured: false });

    await expect(service.handle({ type: 'notification', event: 'payment.succeeded', object: { id: 'p1' } })).rejects.toMatchObject({
      status: 404,
      response: { code: 'INTEGRATION_UNAVAILABLE' }
    });

    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it('refunds through the payment row without settling anything', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue(null);

    await service.handle({ type: 'notification', event: 'refund.succeeded', object: { id: 'r1', payment_id: 'p1' } });

    expect(prisma.payment.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { yookassaPaymentId: 'p1' } }));
    expect(yookassa.getPayment).not.toHaveBeenCalled();
  });

  it('takes back the refunded months as of now', async () => {
    const { service, prisma, entitlements } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(
      mock<Payment>({ id: 'row', userId: 'u1', status: 'succeeded', plan: 'monthly', subscriptionId: 'sub-1', amount: new Prisma.Decimal(PAID) })
    );

    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.subscription.findUnique.mockResolvedValue(mock<Subscription>({ id: 'sub-1', currentPeriodEnd: addMonths(NOW, 3) }));

    await service.handle({ type: 'notification', event: 'refund.succeeded', object: { id: 'r1', payment_id: 'p1' } });

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { currentPeriodEnd: addMonths(NOW, 2) } })
    );

    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('ignores a refund event without a payment', async () => {
    const { service, prisma } = createService();

    await service.handle({ type: 'notification', event: 'refund.succeeded', object: { id: 'r1' } });

    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });
});

describe('WebhookService.refund', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  const succeeded = mock<Payment>({
    id: 'row',
    userId: 'u1',
    status: 'succeeded',
    plan: 'monthly',
    subscriptionId: 'sub-1',
    amount: new Prisma.Decimal(PAID)
  });

  it('ignores a payment that never succeeded', async () => {
    const { service, prisma, entitlements } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    expect(await service.refund({ paymentId: 'p1', now })).toBe(false);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('takes the paid months back and drops the cached entitlement', async () => {
    const { service, prisma, entitlements } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(succeeded);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.subscription.findUnique.mockResolvedValue(mock<Subscription>({ id: 'sub-1', currentPeriodEnd: addMonths(now, 3) }));

    expect(await service.refund({ paymentId: 'p1', now })).toBe(true);

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { currentPeriodEnd: addMonths(now, 2) } })
    );

    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('expires the subscription when the refund covers what is left', async () => {
    const { service, prisma } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(succeeded);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.subscription.findUnique.mockResolvedValue(mock<Subscription>({ id: 'sub-1', currentPeriodEnd: addDays(now, 10) }));

    await service.refund({ paymentId: 'p1', now });

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'expired', cancelAtPeriodEnd: true }) })
    );
  });

  it('marks a payment without a subscription refunded without revoking anything', async () => {
    const { service, prisma, entitlements } = createRefund();

    prisma.payment.findUnique.mockResolvedValue({ ...succeeded, subscriptionId: null });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.refund({ paymentId: 'p1', now })).toBe(true);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('revokes once when the refund webhook is delivered twice', async () => {
    const { service, prisma, entitlements } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(succeeded);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.refund({ paymentId: 'p1', now })).toBe(false);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('keeps access after a partial refund', async () => {
    const { service, prisma, entitlements } = createRefund('50.00');

    prisma.payment.findUnique.mockResolvedValue(succeeded);

    expect(await service.refund({ paymentId: 'p1', now })).toBe(false);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('does not cut the current period when an older payment is refunded', async () => {
    const { service, prisma } = createRefund();

    prisma.payment.findUnique.mockResolvedValue(succeeded);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findFirst.mockResolvedValue(mock<Payment>({ id: 'newer' }));

    expect(await service.refund({ paymentId: 'p1', now })).toBe(true);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });
});
