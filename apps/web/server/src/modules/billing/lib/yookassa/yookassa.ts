import { createHash } from 'node:crypto';

import type { CheckoutKeyInput, YooKassaPayment } from './yookassa.types';

import { YOOKASSA } from '../../config/yookassa.constants';

export const describeCard = (method: YooKassaPayment['payment_method']): string | null => {
  if (!method) {
    return null;
  }

  if (method.card?.last4) {
    return [method.card.card_type, `•••• ${method.card.last4}`].filter(Boolean).join(' ');
  }

  return method.title ?? null;
};

export const toAmount = (rub: number) => ({ value: rub.toFixed(2), currency: YOOKASSA.currency });

export const checkoutIdempotenceKey = ({ userId, plan, promoCode, now }: CheckoutKeyInput): string =>
  createHash('sha256')
    .update([userId, plan, promoCode ?? '', Math.floor(now.getTime() / YOOKASSA.checkoutKeyWindowMs)].join('|'))
    .digest('hex');
