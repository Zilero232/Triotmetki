import { addMilliseconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PromoCode } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../entitlements.service';
import type { SubscriptionWriterService } from '../subscription-writer.service';

import { PROMO_REJECTION_CODE } from '../../config/promo.constants';
import { PromoWriterService } from '../promo-writer.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const promo = mock<PromoCode>({ code: 'FREE7', discountPercent: null, freeDays: 7, maxUses: null, usedCount: 0, expiresAt: null });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const subscriptions = mock<SubscriptionWriterService>();

  return { service: new PromoWriterService(prisma, subscriptions, mock<EntitlementsService>()), prisma, subscriptions };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PromoWriterService.usable', () => {
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

describe('PromoWriterService.redeemFreeDays', () => {
  it('tells a discount code apart from a free-days one', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.promoCode.findUnique.mockResolvedValue({ ...promo, discountPercent: 20, freeDays: null });
    prisma.promoRedemption.findUnique.mockResolvedValue(null);

    await expect(service.redeemFreeDays({ userId: 'u1', code: 'FREE7' })).rejects.toMatchObject({ response: { code: 'PROMO_CHECKOUT_ONLY' } });
    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });
});
