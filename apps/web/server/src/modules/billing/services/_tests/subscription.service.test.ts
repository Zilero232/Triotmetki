import type { PlusState } from '@otmetki/schemas';

import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Payment, Subscription } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../entitlements.service';

import { Prisma } from '../../../../../generated';
import { PLUS_PLANS } from '../../config/plans.constants';
import { SubscriptionService } from '../subscription.service';

const now = new Date('2026-09-25T12:00:00Z');

const plusState = (state: PlusState['state']): PlusState => ({ state, periodEnd: null, graceEndsAt: null, trialAvailable: false, trialDays: 7 });

const createService = (isRecurring: boolean) => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();
  const entitlements = mock<EntitlementsService>();

  config.get.mockReturnValue(isRecurring);
  entitlements.refresh.mockResolvedValue(plusState('none'));

  return { service: new SubscriptionService(prisma, config, entitlements), prisma, entitlements };
};

const paymentRow = (overrides: Partial<Payment>): Payment => ({
  id: 'p',
  userId: 'u1',
  subscriptionId: null,
  yookassaPaymentId: 'yk',
  amount: new Prisma.Decimal(0),
  currency: 'RUB',
  status: 'pending',
  plan: 'monthly',
  isAutoCharge: false,
  promoCode: null,
  metadata: null,
  paidAt: null,
  createdAt: now,
  ...overrides
});

const storedSubscription = (overrides: Partial<Subscription>) =>
  mock<Subscription>({
    id: 'sub-1',
    plan: 'monthly',
    status: 'active',
    currentPeriodEnd: addDays(now, 5),
    cancelAtPeriodEnd: false,
    savedCardId: null,
    savedCardTitle: null,
    ...overrides
  });

describe('SubscriptionService.status', () => {
  it('describes a user without a subscription as having nothing to renew', async () => {
    const { service, prisma } = createService(false);

    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.status('u1')).resolves.toEqual(
      expect.objectContaining({
        isPlus: false,
        plan: null,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        card: null,
        isRecurringAvailable: false
      })
    );
  });

  it('reports Plus from the refreshed entitlement state together with the stored card', async () => {
    const { service, prisma, entitlements } = createService(true);
    const currentPeriodEnd = addDays(now, 5);

    entitlements.refresh.mockResolvedValue(plusState('trial'));

    prisma.subscription.findUnique.mockResolvedValue(
      storedSubscription({ plan: 'quarterly', status: 'trialing', currentPeriodEnd, cancelAtPeriodEnd: true, savedCardTitle: 'Visa 4242' })
    );

    await expect(service.status('u1')).resolves.toEqual(
      expect.objectContaining({ isPlus: true, plan: 'quarterly', currentPeriodEnd: currentPeriodEnd.toISOString(), card: 'Visa 4242' })
    );
  });

  it('lists every plan with its price', async () => {
    const { service, prisma } = createService(true);

    prisma.subscription.findUnique.mockResolvedValue(null);

    const { plans } = await service.status('u1');

    expect(plans).toEqual(Object.values(PLUS_PLANS).map(({ plan, priceRub }) => expect.objectContaining({ plan, priceRub })));
  });
});

describe('SubscriptionService.history', () => {
  it('serialises payments with a numeric amount and ISO dates', async () => {
    const { service, prisma } = createService(true);
    const createdAt = new Date('2026-09-01T10:00:00Z');

    prisma.payment.findMany.mockResolvedValue([
      paymentRow({ id: 'p1', amount: new Prisma.Decimal(PLUS_PLANS.monthly.priceRub), status: 'succeeded', createdAt, paidAt: createdAt }),
      paymentRow({ id: 'p2', amount: new Prisma.Decimal(PLUS_PLANS.yearly.priceRub), createdAt })
    ]);

    await expect(service.history('u1')).resolves.toEqual([
      expect.objectContaining({ id: 'p1', amount: PLUS_PLANS.monthly.priceRub, createdAt: createdAt.toISOString(), paidAt: createdAt.toISOString() }),
      expect.objectContaining({ id: 'p2', amount: PLUS_PLANS.yearly.priceRub, paidAt: null })
    ]);
  });
});

describe('SubscriptionService.setAutoRenew', () => {
  it('refuses to turn renewal on without a saved card', async () => {
    const { service, prisma } = createService(true);

    prisma.subscription.findUnique.mockResolvedValue(storedSubscription({ savedCardId: null }));

    await expect(service.setAutoRenew({ userId: 'u1', isEnabled: true })).rejects.toThrow();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('refuses when the user has no subscription', async () => {
    const { service, prisma } = createService(true);

    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.setAutoRenew({ userId: 'u1', isEnabled: false })).rejects.toMatchObject({ response: { code: 'SUBSCRIPTION_REQUIRED' } });
  });

  it('refuses to turn renewal on while recurring payments are off even with a card', async () => {
    const { service, prisma } = createService(false);

    prisma.subscription.findUnique.mockResolvedValue(storedSubscription({ savedCardId: 'card' }));

    await expect(service.setAutoRenew({ userId: 'u1', isEnabled: true })).rejects.toMatchObject({ response: { code: 'PAYMENT_REQUIRED' } });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('turns renewal on for a saved card', async () => {
    const { service, prisma } = createService(true);

    prisma.subscription.findUnique.mockResolvedValue(storedSubscription({ savedCardId: 'card' }));

    await service.setAutoRenew({ userId: 'u1', isEnabled: true });

    expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sub-1' }, data: { cancelAtPeriodEnd: false } }));
  });

  it('returns the billing status refreshed after the change', async () => {
    const { service, prisma, entitlements } = createService(true);

    prisma.subscription.findUnique.mockResolvedValue(storedSubscription({ savedCardId: 'card', savedCardTitle: 'Visa 4242' }));
    entitlements.refresh.mockResolvedValue(plusState('active'));

    await expect(service.setAutoRenew({ userId: 'u1', isEnabled: true })).resolves.toEqual(
      expect.objectContaining({ isPlus: true, card: 'Visa 4242' })
    );

    expect(entitlements.refresh).toHaveBeenCalledWith('u1');
  });

  it('lets a user cancel renewal without a card', async () => {
    const { service, prisma } = createService(false);

    prisma.subscription.findUnique.mockResolvedValue(storedSubscription({ savedCardId: null }));

    await service.setAutoRenew({ userId: 'u1', isEnabled: false });

    expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sub-1' }, data: { cancelAtPeriodEnd: true } }));
  });
});
