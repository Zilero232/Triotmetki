import { addDays, addMinutes, subMinutes } from 'date-fns';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { PROMO_REJECTION_CODE, PROMO_RESERVATION } from '../../config/promo.constants';
import { BILLING_DB_TABLES, createBillingServices, seedUser } from './billing-db.fixtures';

const NOW = new Date('2026-10-05T12:00:00.000Z');
const CODE = 'SPRING';

describeWithDatabase('PromoService against the database', () => {
  const prisma = createTestPrisma();
  const { promos } = createBillingServices(prisma);

  const seedPromo = (data: { maxUses?: number | null; usedCount?: number; freeDays?: number | null; discountPercent?: number | null } = {}) =>
    prisma.promoCode.create({ data: { code: CODE, discountPercent: 20, ...data } });

  const usedCount = async () => (await prisma.promoCode.findUniqueOrThrow({ where: { code: CODE } })).usedCount;

  const redemption = (userId: string) => prisma.promoRedemption.findUnique({ where: { code_userId: { code: CODE, userId } } });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    await truncateTables({ prisma, tables: [...BILLING_DB_TABLES] });
    await Promise.all(['u1', 'u2'].map((id) => seedUser(prisma, id)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('usable', () => {
    it('finds a code typed in any case with spaces around it', async () => {
      await seedPromo();

      await expect(promos.usable({ userId: 'u1', code: ' spring ' })).resolves.toMatchObject({ code: CODE });
    });

    it('accepts a code again once the reservation of the same user lapsed', async () => {
      await seedPromo();
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: NOW } });

      await expect(promos.usable({ userId: 'u1', code: CODE })).resolves.toMatchObject({ code: CODE });
    });

    it('refuses a code the user holds in a live reservation', async () => {
      await seedPromo();
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: addMinutes(NOW, 1) } });

      await expect(promos.usable({ userId: 'u1', code: CODE })).rejects.toMatchObject({ response: { code: PROMO_REJECTION_CODE.alreadyRedeemed } });
    });
  });

  describe('reserve', () => {
    it('counts the use and holds it for the reservation window', async () => {
      await seedPromo({ maxUses: 5 });

      await promos.reserve({ userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect((await redemption('u1'))?.reservedUntil).toEqual(addMinutes(NOW, PROMO_RESERVATION.minutes));
    });

    it('refuses a used-up code and leaves the count as it was', async () => {
      await seedPromo({ maxUses: 1, usedCount: 1 });

      await expect(promos.reserve({ userId: 'u1', code: CODE })).rejects.toMatchObject({ response: { code: PROMO_REJECTION_CODE.exhausted } });

      expect(await usedCount()).toBe(1);
      expect(await redemption('u1')).toBeNull();
    });

    it('rolls the count back when the user already holds the code', async () => {
      await seedPromo({ maxUses: 5 });
      await promos.reserve({ userId: 'u1', code: CODE });

      await expect(promos.reserve({ userId: 'u1', code: CODE })).rejects.toMatchObject({
        response: { code: PROMO_REJECTION_CODE.alreadyRedeemed }
      });

      expect(await usedCount()).toBe(1);
    });

    it('gives the last use to exactly one of two users reserving at once', async () => {
      await seedPromo({ maxUses: 1 });

      const results = await Promise.allSettled([promos.reserve({ userId: 'u1', code: CODE }), promos.reserve({ userId: 'u2', code: CODE })]);

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(await usedCount()).toBe(1);
      expect(await prisma.promoRedemption.count()).toBe(1);
    });

    it('swaps a lapsed reservation of the same user for a fresh one without counting twice', async () => {
      await seedPromo({ maxUses: 1, usedCount: 1 });
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: subMinutes(NOW, 1) } });

      await promos.reserve({ userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect((await redemption('u1'))?.reservedUntil).toEqual(addMinutes(NOW, PROMO_RESERVATION.minutes));
    });
  });

  describe('release', () => {
    it('gives a reserved use back', async () => {
      await seedPromo();
      await promos.reserve({ userId: 'u1', code: CODE });

      await promos.release({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(0);
      expect(await redemption('u1')).toBeNull();
    });

    it('leaves a confirmed use alone', async () => {
      await seedPromo({ usedCount: 1 });
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1' } });

      await promos.release({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect(await redemption('u1')).not.toBeNull();
    });

    it('never takes the count below zero', async () => {
      await seedPromo({ usedCount: 0 });
      await prisma.promoRedemption.create({ data: { code: CODE, userId: 'u1', reservedUntil: addMinutes(NOW, 5) } });

      await promos.release({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(0);
    });
  });

  describe('confirm', () => {
    it('turns the reservation into a use without counting it again', async () => {
      await seedPromo({ maxUses: 5 });
      await promos.reserve({ userId: 'u1', code: CODE });

      await promos.confirm({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect((await redemption('u1'))?.reservedUntil).toBeNull();
    });

    it('records and counts the use when the reservation was already released', async () => {
      await seedPromo({ maxUses: 5 });

      await promos.confirm({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect((await redemption('u1'))?.reservedUntil).toBeNull();
    });

    it('records the paid use but keeps the count at the limit when the code filled up meanwhile', async () => {
      await seedPromo({ maxUses: 1, usedCount: 1 });

      await promos.confirm({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
      expect(await redemption('u1')).not.toBeNull();
    });

    it('counts a repeated confirmation once', async () => {
      await seedPromo({ maxUses: 5 });

      await promos.confirm({ db: prisma, userId: 'u1', code: CODE });
      await promos.confirm({ db: prisma, userId: 'u1', code: CODE });

      expect(await usedCount()).toBe(1);
    });
  });

  describe('releaseExpired', () => {
    it('gives back only the reservations whose window has passed', async () => {
      await seedPromo({ usedCount: 2 });

      await prisma.promoRedemption.createMany({
        data: [
          { code: CODE, userId: 'u1', reservedUntil: NOW },
          { code: CODE, userId: 'u2', reservedUntil: addMinutes(NOW, 1) }
        ]
      });

      await expect(promos.releaseExpired()).resolves.toBe(1);

      expect(await usedCount()).toBe(1);
      expect(await redemption('u1')).toBeNull();
      expect(await redemption('u2')).not.toBeNull();
    });
  });

  describe('redeemFreeDays', () => {
    it('grants the free days as a non-renewing period and counts the use', async () => {
      await seedPromo({ discountPercent: null, freeDays: 7 });

      await promos.redeemFreeDays({ userId: 'u1', code: 'spring' });

      const subscription = await prisma.subscription.findFirstOrThrow({ where: { userId: 'u1' } });

      expect(subscription).toMatchObject({ status: 'active', currentPeriodEnd: addDays(NOW, 7), cancelAtPeriodEnd: true });
      expect(await usedCount()).toBe(1);
    });

    it('refuses a second redemption and grants nothing more', async () => {
      await seedPromo({ discountPercent: null, freeDays: 7 });
      await promos.redeemFreeDays({ userId: 'u1', code: CODE });

      await expect(promos.redeemFreeDays({ userId: 'u1', code: CODE })).rejects.toMatchObject({
        response: { code: PROMO_REJECTION_CODE.alreadyRedeemed }
      });

      expect((await prisma.subscription.findFirstOrThrow({ where: { userId: 'u1' } })).currentPeriodEnd).toEqual(addDays(NOW, 7));
      expect(await usedCount()).toBe(1);
    });

    it('refuses a discount code without touching the subscription', async () => {
      await seedPromo({ discountPercent: 20, freeDays: null });

      await expect(promos.redeemFreeDays({ userId: 'u1', code: CODE })).rejects.toMatchObject({ response: { code: 'PROMO_CHECKOUT_ONLY' } });

      expect(await prisma.subscription.count()).toBe(0);
    });
  });
});
