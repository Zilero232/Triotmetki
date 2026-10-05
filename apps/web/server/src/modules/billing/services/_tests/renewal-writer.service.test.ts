import { addDays, addHours, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Payment, Subscription } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { YooKassaClient } from '../../lib/yookassa/yookassa.client';
import type { YooKassaPayment } from '../../lib/yookassa/yookassa.types';
import type { EntitlementsService } from '../entitlements.service';
import type { SettlementWriterService } from '../settlement-writer.service';
import type { SubscriptionWriterService } from '../subscription-writer.service';

import { RENEWAL } from '../../config/renewal.constants';
import { renewalIdempotenceKey } from '../../lib/period/period';
import { planPrice } from '../../lib/pricing/pricing';
import { RenewalWriterService } from '../renewal-writer.service';

const now = new Date('2026-09-25T12:00:00Z');
const periodEnd = addHours(now, 2);

const dueSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
  mock<Subscription>({
    id: 'sub-1',
    userId: 'u1',
    plan: 'quarterly',
    status: 'active',
    savedCardId: 'card-1',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: periodEnd,
    ...overrides
  });

const remote = (status: YooKassaPayment['status'], id = 'pay-1'): YooKassaPayment => ({
  id,
  status,
  amount: { value: '0.00', currency: 'RUB' }
});

type Options = {
  isRecurring?: boolean;
  isConfigured?: boolean;
  isCheckout?: boolean;
};

const createService = ({ isRecurring = true, isConfigured = true, isCheckout = true }: Options = {}) => {
  const prisma = mockDeep<PrismaService>();
  const yookassa = mock<YooKassaClient>({ isConfigured });
  const subscriptions = mock<SubscriptionWriterService>({ isRecurringEnabled: isRecurring, isCheckoutEnabled: isCheckout });
  const webhooks = mock<SettlementWriterService>();
  const entitlements = mock<EntitlementsService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.payment.findMany.mockResolvedValue([]);
  yookassa.chargeSavedMethod.mockResolvedValue(remote('pending'));

  const service = new RenewalWriterService(prisma, yookassa, subscriptions, webhooks, entitlements);

  return { service, prisma, yookassa, webhooks, entitlements };
};

describe('RenewalWriterService.chargeDue', () => {
  it('charges nobody while paid checkout is closed', async () => {
    const { service, prisma } = createService({ isCheckout: false });

    await expect(service.chargeDue(now)).resolves.toBe(0);
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it('charges nobody while recurring payments are off', async () => {
    const { service, prisma } = createService({ isRecurring: false });

    await expect(service.chargeDue(now)).resolves.toBe(0);
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it('charges nobody while YooKassa is not configured', async () => {
    const { service, prisma } = createService({ isConfigured: false });

    await expect(service.chargeDue(now)).resolves.toBe(0);
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it('picks subscriptions ending within the lead window and not older than the grace period', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findMany.mockResolvedValue([]);

    await service.chargeDue(now);

    expect(prisma.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cancelAtPeriodEnd: false,
          currentPeriodEnd: { lte: addHours(now, RENEWAL.leadHours), gt: subDays(now, RENEWAL.pastDueGraceDays) }
        }),
        take: RENEWAL.batchSize
      })
    );
  });

  it('charges the saved card the full plan price under a key bound to the period', async () => {
    const { service, prisma, yookassa } = createService();
    const subscription = dueSubscription();

    prisma.subscription.findMany.mockResolvedValue([subscription]);

    await expect(service.chargeDue(now)).resolves.toBe(1);

    expect(yookassa.chargeSavedMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        amountRub: planPrice({ plan: 'quarterly', discountPercent: null }),
        paymentMethodId: 'card-1',
        idempotenceKey: renewalIdempotenceKey({ subscriptionId: subscription.id, currentPeriodEnd: periodEnd })
      })
    );
  });

  it('records the renewal as a pending auto-charge keyed by the YooKassa payment', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription()]);

    await service.chargeDue(now);

    expect(prisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { yookassaPaymentId: 'pay-1' },
        create: expect.objectContaining({ subscriptionId: 'sub-1', status: 'pending', isAutoCharge: true }),
        update: {}
      })
    );
  });

  it('does not charge again while an earlier auto-charge is still pending', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription()]);
    prisma.payment.findMany.mockResolvedValue([mock<Payment>({ subscriptionId: 'sub-1' })]);

    await expect(service.chargeDue(now)).resolves.toBe(0);
    expect(yookassa.chargeSavedMethod).not.toHaveBeenCalled();
  });

  it('reuses the idempotence key when the same period is retried', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription()]);

    await service.chargeDue(now);
    await service.chargeDue(addHours(now, 1));

    const [first, second] = yookassa.chargeSavedMethod.mock.calls.map(([input]) => input.idempotenceKey);

    expect(second).toBe(first);
  });

  it('uses a new idempotence key once the period moved on', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.subscription.findMany.mockResolvedValueOnce([dueSubscription()]);
    prisma.subscription.findMany.mockResolvedValueOnce([dueSubscription({ currentPeriodEnd: addDays(periodEnd, 90) })]);

    await service.chargeDue(now);
    await service.chargeDue(now);

    const [first, second] = yookassa.chargeSavedMethod.mock.calls.map(([input]) => input.idempotenceKey);

    expect(second).not.toBe(first);
  });

  it('skips a subscription without a period end', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription({ currentPeriodEnd: null })]);

    await expect(service.chargeDue(now)).resolves.toBe(0);
    expect(yookassa.chargeSavedMethod).not.toHaveBeenCalled();
  });

  it('settles a charge that YooKassa finished synchronously and counts it by the settlement', async () => {
    const { service, prisma, yookassa, webhooks } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription()]);
    yookassa.chargeSavedMethod.mockResolvedValue(remote('succeeded'));
    webhooks.settle.mockResolvedValue(true);

    await expect(service.chargeDue(now)).resolves.toBe(1);
    expect(webhooks.settle).toHaveBeenCalledWith('pay-1');
  });

  it('does not count a synchronously finished charge that did not settle', async () => {
    const { service, prisma, yookassa, webhooks } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription()]);
    yookassa.chargeSavedMethod.mockResolvedValue(remote('canceled'));
    webhooks.settle.mockResolvedValue(false);

    await expect(service.chargeDue(now)).resolves.toBe(0);
  });

  it('moves a subscription into the grace period when its charge fails and goes on with the rest', async () => {
    const { service, prisma, yookassa } = createService();

    prisma.subscription.findMany.mockResolvedValue([dueSubscription(), dueSubscription({ id: 'sub-2', userId: 'u2' })]);
    yookassa.chargeSavedMethod.mockRejectedValueOnce(new Error('declined'));

    await expect(service.chargeDue(now)).resolves.toBe(1);
    expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sub-1' }, data: { status: 'pastDue' } }));
    expect(prisma.subscription.update).toHaveBeenCalledTimes(1);
  });
});

describe('RenewalWriterService.expireDue', () => {
  const run = async (counts: [number, number, number]) => {
    const context = createService();

    context.prisma.subscription.findMany.mockResolvedValue([mock<Subscription>({ userId: 'u1' }), mock<Subscription>({ userId: 'u2' })]);

    for (const count of counts) {
      context.prisma.subscription.updateMany.mockResolvedValueOnce({ count });
    }

    const total = await context.service.expireDue(now);

    return { ...context, total };
  };

  it('reports every lapsed, overdue and newly unpaid subscription', async () => {
    const counts: [number, number, number] = [1, 2, 3];
    const { total } = await run(counts);

    expect(total).toBe(counts.reduce((sum, count) => sum + count, 0));
  });

  it('expires a cancelled or cardless subscription once its period ended', async () => {
    const { prisma } = await run([1, 0, 0]);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ currentPeriodEnd: { lt: now }, OR: [{ cancelAtPeriodEnd: true }, { savedCardId: null }] }),
        data: { status: 'expired' }
      })
    );
  });

  it('expires a past-due subscription only after the grace period', async () => {
    const { prisma } = await run([0, 1, 0]);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'pastDue', currentPeriodEnd: { lt: subDays(now, RENEWAL.pastDueGraceDays) } },
        data: { status: 'expired' }
      })
    );
  });

  it('puts an unpaid auto-renewing subscription into the grace period instead of expiring it', async () => {
    const { prisma } = await run([0, 0, 1]);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active', cancelAtPeriodEnd: false, savedCardId: { not: null } }),
        data: { status: 'pastDue' }
      })
    );
  });

  it('resyncs tracking for every user whose access ends', async () => {
    const { entitlements } = await run([1, 1, 0]);

    expect(entitlements.syncTracking.mock.calls.map(([userId]) => userId)).toEqual(['u1', 'u2']);
  });
});
