import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PromoCode } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { YooKassaClient, YooKassaPayment } from '../../lib';
import type { PromoService } from '../promo.service';
import type { SubscriptionService } from '../subscription.service';

import { BILLING_LINKS, PLUS_PLANS } from '../../config';
import { planPrice } from '../../lib';
import { CheckoutService } from '../checkout.service';

type ServiceOptions = {
  isRecurring?: boolean;
  isCheckout?: boolean;
  isConfigured?: boolean;
};

const webUrl = 'https://otmetki.test';
const confirmationUrl = 'https://yookassa.test/confirm';

const created = (confirmation: YooKassaPayment['confirmation'] = { confirmation_url: confirmationUrl }): YooKassaPayment => ({
  id: 'pay-1',
  status: 'pending',
  amount: { value: '0.00', currency: 'RUB' },
  confirmation
});

const createService = ({ isRecurring = true, isCheckout = true, isConfigured = true }: ServiceOptions = {}) => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();
  const yookassa = mock<YooKassaClient>({ isConfigured });
  const promos = mock<PromoService>();
  const subscriptions = mock<SubscriptionService>({ isRecurringEnabled: isRecurring, isCheckoutEnabled: isCheckout });

  config.get.mockReturnValue(webUrl);
  yookassa.createPayment.mockResolvedValue(created());

  return { service: new CheckoutService(prisma, config, yookassa, promos, subscriptions), prisma, yookassa, promos };
};

describe('CheckoutService.createCheckout', () => {
  it('refuses while paid checkout is closed', async () => {
    const { service, yookassa } = createService({ isCheckout: false });

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly' })).rejects.toMatchObject({ response: { code: 'CHECKOUT_UNAVAILABLE' } });
    expect(yookassa.createPayment).not.toHaveBeenCalled();
  });

  it('refuses while YooKassa is not configured, even with checkout open', async () => {
    const { service, yookassa } = createService({ isConfigured: false });

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly' })).rejects.toMatchObject({
      status: 403,
      response: { code: 'CHECKOUT_UNAVAILABLE' }
    });

    expect(yookassa.createPayment).not.toHaveBeenCalled();
  });

  it('asks for the list price of the plan without a promo code', async () => {
    const { service, yookassa, promos } = createService();

    await service.createCheckout({ userId: 'u1', plan: 'yearly' });

    expect(promos.usable).not.toHaveBeenCalled();
    expect(yookassa.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amountRub: PLUS_PLANS.yearly.priceRub }));
  });

  it('applies the promo discount to the price and records the code on the payment', async () => {
    const { service, yookassa, promos, prisma } = createService();

    promos.usable.mockResolvedValue(mock<PromoCode>({ code: 'SPRING', discountPercent: 25 }));

    await service.createCheckout({ userId: 'u1', plan: 'quarterly', promoCode: 'spring' });

    const amountRub = planPrice({ plan: 'quarterly', discountPercent: 25 });

    expect(amountRub).toBeLessThan(PLUS_PLANS.quarterly.priceRub);
    expect(yookassa.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amountRub }));

    expect(prisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ amount: amountRub, promoCode: 'SPRING' }) })
    );
  });

  it('reserves the promo code before asking YooKassa for the discounted payment', async () => {
    const { service, yookassa, promos } = createService();

    promos.usable.mockResolvedValue(mock<PromoCode>({ code: 'SPRING', discountPercent: 25 }));

    await service.createCheckout({ userId: 'u1', plan: 'monthly', promoCode: 'spring' });

    expect(promos.reserve).toHaveBeenCalledWith({ userId: 'u1', code: 'SPRING' });
    expect(promos.reserve.mock.invocationCallOrder[0]).toBeLessThan(yookassa.createPayment.mock.invocationCallOrder[0] ?? 0);
  });

  it('gives the reserved promo use back when YooKassa returns no confirmation link', async () => {
    const { service, yookassa, promos, prisma } = createService();

    promos.usable.mockResolvedValue(mock<PromoCode>({ code: 'SPRING', discountPercent: 25 }));
    yookassa.createPayment.mockResolvedValue(created({}));

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly', promoCode: 'spring' })).rejects.toMatchObject({
      response: { code: 'PAYMENT_FAILED' }
    });

    expect(promos.release).toHaveBeenCalledWith({ db: prisma, userId: 'u1', code: 'SPRING' });
  });

  it('gives the reserved promo use back when YooKassa refuses the payment', async () => {
    const { service, yookassa, promos, prisma } = createService();

    promos.usable.mockResolvedValue(mock<PromoCode>({ code: 'SPRING', discountPercent: 25 }));
    yookassa.createPayment.mockRejectedValue(new Error('yookassa down'));

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly', promoCode: 'spring' })).rejects.toThrow('yookassa down');

    expect(promos.release).toHaveBeenCalledWith({ db: prisma, userId: 'u1', code: 'SPRING' });
  });

  it('sends a free-days promo code to redemption instead of a payment', async () => {
    const { service, yookassa, promos } = createService();

    promos.usable.mockResolvedValue(mock<PromoCode>({ code: 'FREE7', discountPercent: null, freeDays: 7 }));

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly', promoCode: 'FREE7' })).rejects.toMatchObject({
      response: { code: 'PROMO_REDEEM_ONLY' }
    });

    expect(yookassa.createPayment).not.toHaveBeenCalled();
  });

  it('sends a double submit to YooKassa with one idempotence key', async () => {
    const { service, yookassa } = createService();

    vi.useFakeTimers({ now: new Date('2026-09-25T12:00:10Z') });
    await service.createCheckout({ userId: 'u1', plan: 'monthly' });
    await service.createCheckout({ userId: 'u1', plan: 'monthly' });
    vi.useRealTimers();

    const [first, second] = yookassa.createPayment.mock.calls.map(([input]) => input.idempotenceKey);

    expect(second).toBe(first);
  });

  it('returns the shopper to the billing page of the site', async () => {
    const { service, yookassa } = createService();

    await service.createCheckout({ userId: 'u1', plan: 'monthly' });

    expect(yookassa.createPayment).toHaveBeenCalledWith(expect.objectContaining({ returnUrl: new URL(BILLING_LINKS.returnPath, webUrl).href }));
  });

  it.each([true, false])('asks to save the card only when recurring payments are on (%s)', async (isRecurring) => {
    const { service, yookassa } = createService({ isRecurring });

    await service.createCheckout({ userId: 'u1', plan: 'monthly' });

    expect(yookassa.createPayment).toHaveBeenCalledWith(expect.objectContaining({ savePaymentMethod: isRecurring }));
  });

  it('records a pending payment and hands back the confirmation link', async () => {
    const { service, prisma } = createService();

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly' })).resolves.toEqual({ confirmationUrl, paymentId: 'pay-1' });

    expect(prisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { yookassaPaymentId: 'pay-1' },
        create: expect.objectContaining({ userId: 'u1', yookassaPaymentId: 'pay-1', status: 'pending', plan: 'monthly', promoCode: null })
      })
    );
  });

  it('fails without recording anything when YooKassa returns no confirmation link', async () => {
    const { service, yookassa, prisma } = createService();

    yookassa.createPayment.mockResolvedValue(created({}));

    await expect(service.createCheckout({ userId: 'u1', plan: 'monthly' })).rejects.toMatchObject({ response: { code: 'PAYMENT_FAILED' } });
    expect(prisma.payment.upsert).not.toHaveBeenCalled();
  });
});
