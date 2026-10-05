import type { PaymentHistoryItem } from '@otmetki/schemas';

import type { Payment } from '../../../../generated';

import { toIso } from '../../../common/lib';

export const toPaymentHistoryItem = (payment: Payment): PaymentHistoryItem => ({
  id: payment.id,
  amount: payment.amount.toNumber(),
  currency: payment.currency,
  status: payment.status,
  plan: payment.plan,
  isAutoCharge: payment.isAutoCharge,
  promoCode: payment.promoCode,
  createdAt: payment.createdAt.toISOString(),
  paidAt: toIso(payment.paidAt)
});
