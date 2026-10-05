import type { CompiledQuery } from 'kysely';

import { addMonths } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Payment, Subscription } from '../../../../../generated';
import type { YooKassaClient } from '../../lib/yookassa/yookassa.client';
import type { YooKassaPayment } from '../../lib/yookassa/yookassa.types';
import type { EntitlementsService } from '../entitlements.service';
import type { PromoWriterService } from '../promo-writer.service';
import type { ReferralWriterService } from '../referral-writer.service';
import type { SubscriptionWriterService } from '../subscription-writer.service';

import { Prisma } from '../../../../../generated';
import { advisoryLocks, mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { PLUS_PLANS } from '../../config/plans.constants';
import { SUBSCRIPTION_LOCK } from '../../config/subscription-lock.constants';
import { SettlementWriterService } from '../settlement-writer.service';

const NOW = new Date('2026-09-25T12:00:00Z');
const PAID = '199.00';

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
  yookassaPaymentId: 'p1',
  status: 'pending',
  plan: 'yearly',
  promoCode: null,
  isAutoCharge: false,
  subscriptionId: null
});

const succeededPayment = mock<Payment>({
  id: 'row',
  userId: 'u1',
  status: 'succeeded',
  plan: 'monthly',
  subscriptionId: 'sub-1',
  amount: new Prisma.Decimal(PAID)
});

const remote = (status: YooKassaPayment['status']): YooKassaPayment => ({
  id: 'p1',
  status,
  amount: { value: PAID, currency: 'RUB' },
  refunded_amount: { value: PAID, currency: 'RUB' }
});

const createService = ({ isConfigured = true }: { isConfigured?: boolean } = {}) => {
  const queries: CompiledQuery[] = [];
  const prisma = mockPrismaService({ queries });
  const yookassa = mock<YooKassaClient>({ isConfigured });
  const subscriptions = mock<SubscriptionWriterService>();
  const entitlements = mock<EntitlementsService>();
  const referrals = mock<ReferralWriterService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  subscriptions.activate.mockResolvedValue('sub-1');

  const service = new SettlementWriterService(prisma, yookassa, subscriptions, entitlements, mock<PromoWriterService>(), referrals);

  return { service, prisma, queries, yookassa, subscriptions, entitlements, referrals };
};

describe('SettlementWriterService.settle', () => {
  it('settles under the subscription lock of the payer', async () => {
    const { service, prisma, queries, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.settle('p1');

    expect(advisoryLocks(queries)).toEqual([[SUBSCRIPTION_LOCK.scope, 'u1']]);
  });

  it('activates the monthly plan for a payment row without a plan', async () => {
    const { service, prisma, yookassa, subscriptions } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, plan: null });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.settle('p1');

    expect(subscriptions.activate).toHaveBeenCalledWith(expect.objectContaining({ plan: PLUS_PLANS.monthly.plan }));
  });

  it('refreshes the tracking of the payer and of the rewarded referrer', async () => {
    const { service, prisma, yookassa, referrals, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));
    referrals.reward.mockResolvedValue('referrer');

    await service.settle('p1');

    expect(entitlements.syncTracking.mock.calls.map(([userId]) => userId)).toEqual(['u1', 'referrer']);
  });

  it('refreshes no tracking when a concurrent webhook claimed the payment first', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await expect(service.settle('p1')).resolves.toBe(false);
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('drops the cached entitlement when a renewal charge is cancelled', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, isAutoCharge: true, subscriptionId: 'sub-1' });
    yookassa.getPayment.mockResolvedValue(remote('canceled'));

    await service.settle('p1');

    expect(entitlements.invalidate).toHaveBeenCalledWith('u1');
  });

  it('cancels a one-off payment without touching any subscription', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    yookassa.getPayment.mockResolvedValue(remote('canceled'));

    await expect(service.settle('p1')).resolves.toBe(false);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(entitlements.invalidate).not.toHaveBeenCalled();
  });
});

describe('SettlementWriterService.handle', () => {
  it('answers integration-unavailable and asks YooKassa nothing while it is not configured', async () => {
    const { service, yookassa } = createService({ isConfigured: false });

    await expect(service.handle({ type: 'notification', event: 'payment.succeeded', object: { id: 'p1' } })).rejects.toMatchObject({
      status: 404,
      response: { code: 'INTEGRATION_UNAVAILABLE' }
    });

    expect(yookassa.getPayment).not.toHaveBeenCalled();
  });

  it('routes a refund event to the refund of its payment without settling anything', async () => {
    const { service, prisma, yookassa, subscriptions, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(succeededPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findFirst.mockResolvedValue(mock<Payment>({ id: 'row' }));
    prisma.subscription.findUnique.mockResolvedValue(mock<Subscription>({ id: 'sub-1', currentPeriodEnd: addMonths(NOW, 3) }));
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await service.handle({ type: 'notification', event: 'refund.succeeded', object: { id: 'r1', payment_id: 'p1' } });

    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
    expect(subscriptions.activate).not.toHaveBeenCalled();
  });

  it('ignores a refund event without a payment', async () => {
    const { service, yookassa } = createService();

    await service.handle({ type: 'notification', event: 'refund.succeeded', object: { id: 'r1' } });

    expect(yookassa.getPayment).not.toHaveBeenCalled();
  });
});

describe('SettlementWriterService.refund', () => {
  it('ignores a payment that never succeeded', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    await expect(service.refund({ paymentId: 'p1', now: NOW })).resolves.toBe(false);
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });

  it('marks a payment without a subscription refunded without revoking anything', async () => {
    const { service, prisma, yookassa, entitlements } = createService();

    prisma.payment.findUnique.mockResolvedValue({ ...succeededPayment, subscriptionId: null });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await expect(service.refund({ paymentId: 'p1', now: NOW })).resolves.toBe(true);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('does not cut the current period when an older payment is refunded', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.payment.findUnique.mockResolvedValue(succeededPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findFirst.mockResolvedValue(mock<Payment>({ id: 'newer' }));
    yookassa.getPayment.mockResolvedValue(remote('succeeded'));

    await expect(service.refund({ paymentId: 'p1', now: NOW })).resolves.toBe(true);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });
});
