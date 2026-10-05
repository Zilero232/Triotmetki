import { addMilliseconds, addMinutes } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PromoCode } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../entitlements.service';
import type { SubscriptionService } from '../subscription.service';

import { PROMO_REJECTION_CODE, PROMO_RESERVATION } from '../../config';
import { PromoService } from '../promo.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const promo = mock<PromoCode>({ code: 'FREE7', discountPercent: null, freeDays: 7, maxUses: null, usedCount: 0, expiresAt: null });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const subscriptions = mock<SubscriptionService>();
  const entitlements = mock<EntitlementsService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { service: new PromoService(prisma, subscriptions, entitlements), prisma, subscriptions, entitlements };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PromoService.normalise', () => {
  it('trims and upper-cases a code', () => {
    const { service } = createService();

    expect(service.normalise('  free7 ')).toBe('FREE7');
  });
});

describe('PromoService.usable', () => {
  it('looks codes up case-insensitively', async () => {
    const { service, prisma } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(promo);
    prisma.promoRedemption.findUnique.mockResolvedValue(null);

    await expect(service.usable({ userId: 'u1', code: ' free7 ' })).resolves.toBe(promo);
  });

  it.each([
    ['an unknown code', null, null, PROMO_REJECTION_CODE.unknown],
    ['a code that expires right now', { ...promo, expiresAt: NOW }, null, PROMO_REJECTION_CODE.expired],
    ['a used-up code', { ...promo, maxUses: 1, usedCount: 1 }, null, PROMO_REJECTION_CODE.exhausted],
    ['a code already redeemed', promo, { code: 'FREE7', userId: 'u1', redeemedAt: NOW, reservedUntil: null }, PROMO_REJECTION_CODE.alreadyRedeemed]
  ])('names the reason for %s in the error code', async (_, row, redemption, code) => {
    const { service, prisma } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(row);
    prisma.promoRedemption.findUnique.mockResolvedValue(redemption);

    await expect(service.usable({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({ status: 400, response: { code } });
  });

  it('accepts a code until the millisecond it expires', async () => {
    const { service, prisma } = createService();
    const expiring = { ...promo, expiresAt: addMilliseconds(NOW, 1) };

    prisma.promoCode.findUnique.mockResolvedValue(expiring);
    prisma.promoRedemption.findUnique.mockResolvedValue(null);

    await expect(service.usable({ userId: 'u1', code: 'FREE7' })).resolves.toBe(expiring);
  });
});

describe('PromoService.redeemFreeDays', () => {
  it('grants the free days of the code, counts the use and syncs tracking', async () => {
    const { service, prisma, subscriptions, entitlements } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(promo);
    prisma.promoRedemption.findUnique.mockResolvedValue(null);
    prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 1 });

    await service.redeemFreeDays({ userId: 'u1', code: 'FREE7' });

    expect(subscriptions.grantDays).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', days: promo.freeDays, now: NOW }));
    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { usedCount: { increment: 1 } } }));
    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('refuses when a concurrent redemption took the last use', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.promoCode.findUnique.mockResolvedValue({ ...promo, maxUses: 1 });
    prisma.promoRedemption.findUnique.mockResolvedValue(null);
    prisma.promoCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.redeemFreeDays({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({
      response: { code: PROMO_REJECTION_CODE.exhausted }
    });

    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });

  it('refuses when a concurrent request of the same user redeemed first', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(promo);
    prisma.promoRedemption.findUnique.mockResolvedValue(null);
    prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 0 });

    await expect(service.redeemFreeDays({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({
      response: { code: PROMO_REJECTION_CODE.alreadyRedeemed }
    });

    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });

  it('refuses a code the user already redeemed', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(promo);
    prisma.promoRedemption.findUnique.mockResolvedValue({ code: 'FREE7', userId: 'u1', redeemedAt: NOW, reservedUntil: null });

    await expect(service.redeemFreeDays({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({
      response: { code: PROMO_REJECTION_CODE.alreadyRedeemed }
    });

    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });

  it('tells a discount code apart from a free-days one', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.promoCode.findUnique.mockResolvedValue({ ...promo, discountPercent: 20, freeDays: null });
    prisma.promoRedemption.findUnique.mockResolvedValue(null);

    await expect(service.redeemFreeDays({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({ response: { code: 'PROMO_CHECKOUT_ONLY' } });
    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });
});

describe('PromoService.recordRedemption', () => {
  it('counts a paid redemption', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.createMany.mockResolvedValue({ count: 1 });

    await service.recordRedemption({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ code: 'SPRING' }), data: { usedCount: { increment: 1 } } })
    );
  });

  it('counts a paid redemption once even when the webhook repeats', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.createMany.mockResolvedValue({ count: 0 });

    await service.recordRedemption({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoCode.updateMany).not.toHaveBeenCalled();
  });
});

describe('PromoService.reserve', () => {
  it('counts the reservation against the limit and holds it for the configured window', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 0 });
    prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 1 });

    await service.reserve({ userId: 'u1', code: 'SPRING' });

    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { usedCount: { increment: 1 } } }));

    expect(prisma.promoRedemption.createMany).toHaveBeenCalledWith({
      data: [{ code: 'SPRING', userId: 'u1', reservedUntil: addMinutes(NOW, PROMO_RESERVATION.minutes) }],
      skipDuplicates: true
    });
  });

  it('refuses a second checkout while the first one still holds the code', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 0 });
    prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 0 });

    await expect(service.reserve({ userId: 'u1', code: 'SPRING' })).rejects.toMatchObject({
      response: { code: PROMO_REJECTION_CODE.alreadyRedeemed }
    });
  });

  it('refuses when the reserved and used redemptions already fill the limit', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 0 });
    prisma.promoCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.reserve({ userId: 'u1', code: 'SPRING' })).rejects.toMatchObject({
      response: { code: PROMO_REJECTION_CODE.exhausted }
    });

    expect(prisma.promoRedemption.createMany).not.toHaveBeenCalled();
  });

  it('frees a lapsed reservation of the same user before taking a new one', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 1 });
    prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 1 });

    await service.reserve({ userId: 'u1', code: 'SPRING' });

    expect(prisma.promoRedemption.deleteMany).toHaveBeenCalledWith({
      where: { code: 'SPRING', userId: 'u1', reservedUntil: { not: null, lte: NOW } }
    });

    expect(prisma.promoCode.updateMany.mock.calls[0]?.[0]).toMatchObject({ data: { usedCount: { decrement: 1 } } });
  });
});

describe('PromoService.usable and reservations', () => {
  it('lets a user whose reservation lapsed use the code again', async () => {
    const { service, prisma } = createService();

    prisma.promoCode.findUnique.mockResolvedValue(promo);
    prisma.promoRedemption.findUnique.mockResolvedValue({ code: 'FREE7', userId: 'u1', redeemedAt: NOW, reservedUntil: NOW });

    await expect(service.usable({ userId: 'u1', code: 'FREE7' })).resolves.toBe(promo);
  });
});

describe('PromoService.confirm', () => {
  it('turns the reservation into a use without counting it twice', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.updateMany.mockResolvedValue({ count: 1 });

    await service.confirm({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoRedemption.updateMany).toHaveBeenCalledWith({
      where: { code: 'SPRING', userId: 'u1', reservedUntil: { not: null } },
      data: { reservedUntil: null }
    });

    expect(prisma.promoCode.updateMany).not.toHaveBeenCalled();
  });

  it('records the use when the reservation had already lapsed', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.updateMany.mockResolvedValue({ count: 0 });
    prisma.promoRedemption.createMany.mockResolvedValue({ count: 1 });

    await service.confirm({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { usedCount: { increment: 1 } } }));
  });
});

describe('PromoService.release', () => {
  it('gives the reserved use back when the checkout is cancelled', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 1 });

    await service.release({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoRedemption.deleteMany).toHaveBeenCalledWith({ where: { code: 'SPRING', userId: 'u1', reservedUntil: { not: null } } });

    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith({
      where: { code: 'SPRING', usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } }
    });
  });

  it('leaves a confirmed use alone', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 0 });

    await service.release({ db: prisma, userId: 'u1', code: 'SPRING' });

    expect(prisma.promoCode.updateMany).not.toHaveBeenCalled();
  });
});

describe('PromoService.releaseExpired', () => {
  it('gives back every reservation whose checkout timed out', async () => {
    const { service, prisma } = createService();

    prisma.promoRedemption.findMany.mockResolvedValue([
      { code: 'SPRING', userId: 'u1', redeemedAt: NOW, reservedUntil: NOW },
      { code: 'SPRING', userId: 'u2', redeemedAt: NOW, reservedUntil: NOW }
    ]);

    prisma.promoRedemption.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.releaseExpired()).resolves.toBe(2);
    expect(prisma.promoRedemption.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { reservedUntil: { not: null, lte: NOW } } }));
    expect(prisma.promoCode.updateMany).toHaveBeenCalledTimes(2);
  });
});
