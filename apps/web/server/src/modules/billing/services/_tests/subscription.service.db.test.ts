import { addDays, addMonths, subDays } from 'date-fns';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { PLUS_PLANS } from '../../config/plans.constants';
import { BILLING_DB_TABLES, createBillingServices, seedUser } from './billing-db.fixtures';

const NOW = new Date('2026-10-05T12:00:00.000Z');

describeWithDatabase('SubscriptionService writes against the database', () => {
  const prisma = createTestPrisma();
  const { subscriptions } = createBillingServices(prisma);

  const seedSubscription = (data: { status: 'active' | 'expired'; currentPeriodEnd: Date; cancelAtPeriodEnd?: boolean; savedCardId?: string }) =>
    prisma.subscription.create({ data: { userId: 'u1', product: 'plus', ...data } });

  const stored = () => prisma.subscription.findFirstOrThrow({ where: { userId: 'u1' } });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: [...BILLING_DB_TABLES] });
    await seedUser(prisma, 'u1');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('activate', () => {
    it('adds the paid months on top of a running period', async () => {
      await seedSubscription({ status: 'active', currentPeriodEnd: addDays(NOW, 10), savedCardId: 'card' });

      await subscriptions.activate({ db: prisma, userId: 'u1', plan: 'monthly', method: null, now: NOW });

      expect(await stored()).toMatchObject({ status: 'active', currentPeriodEnd: addMonths(addDays(NOW, 10), 1), cancelAtPeriodEnd: false });
    });

    it('restarts a lapsed subscription from now and forgets the old cancellation', async () => {
      await seedSubscription({ status: 'expired', currentPeriodEnd: subDays(NOW, 5), cancelAtPeriodEnd: true });

      await subscriptions.activate({ db: prisma, userId: 'u1', plan: 'yearly', method: { id: 'card', title: 'Visa' }, now: NOW });

      expect(await stored()).toMatchObject({
        plan: 'yearly',
        currentPeriodEnd: addMonths(NOW, PLUS_PLANS.yearly.months),
        cancelAtPeriodEnd: false,
        savedCardId: 'card',
        savedCardTitle: 'Visa'
      });
    });

    it('keeps the cancellation and the card of a running subscription', async () => {
      await seedSubscription({ status: 'active', currentPeriodEnd: addDays(NOW, 3), cancelAtPeriodEnd: true, savedCardId: 'card' });

      await subscriptions.activate({ db: prisma, userId: 'u1', plan: 'monthly', method: null, now: NOW });

      expect(await stored()).toMatchObject({ cancelAtPeriodEnd: true, savedCardId: 'card' });
    });

    it('creates a non-renewing subscription for a first payment without a saved card', async () => {
      const id = await subscriptions.activate({ db: prisma, userId: 'u1', plan: 'monthly', method: null, now: NOW });

      expect(await stored()).toMatchObject({ id, status: 'active', currentPeriodEnd: addMonths(NOW, 1), cancelAtPeriodEnd: true });
    });
  });

  describe('grantDays', () => {
    it('adds the days on top of a running period without touching its renewal', async () => {
      await seedSubscription({ status: 'active', currentPeriodEnd: addDays(NOW, 10), savedCardId: 'card' });

      await subscriptions.grantDays({ db: prisma, userId: 'u1', days: 7, now: NOW });

      expect(await stored()).toMatchObject({ currentPeriodEnd: addDays(NOW, 17), cancelAtPeriodEnd: false });
    });

    it('starts a non-renewing period from now for a lapsed subscription', async () => {
      await seedSubscription({ status: 'expired', currentPeriodEnd: subDays(NOW, 3) });

      await subscriptions.grantDays({ db: prisma, userId: 'u1', days: 7, now: NOW });

      expect(await stored()).toMatchObject({ status: 'active', currentPeriodEnd: addDays(NOW, 7), cancelAtPeriodEnd: true });
    });

    it('creates a non-renewing subscription for a user who never had one', async () => {
      await subscriptions.grantDays({ db: prisma, userId: 'u1', days: 30, now: NOW });

      expect(await stored()).toMatchObject({ status: 'active', currentPeriodEnd: addDays(NOW, 30), cancelAtPeriodEnd: true });
    });
  });
});
