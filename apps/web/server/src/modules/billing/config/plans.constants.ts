import type { ApiErrorCode } from '@otmetki/schemas';

import { BRAND } from '@otmetki/schemas';

import type { PromoRejection } from '../lib/promo-check';

export const PLUS_PLANS = {
  monthly: { plan: 'monthly', months: 1, priceRub: 199 },
  quarterly: { plan: 'quarterly', months: 3, priceRub: 529 },
  yearly: { plan: 'yearly', months: 12, priceRub: 1_990 }
} as const;

export const PAYMENT_DESCRIPTION = {
  purchase: `${BRAND.plusName}: {months} мес.`,
  renewal: `Продление «${BRAND.plusName}»: {months} мес.`
} as const;

export const BILLING_LINKS = {
  returnPath: '/me/billing?checkout=return'
} as const;

export const PRICING = {
  minPriceRub: 1
} as const;

export const PROMO_REJECTION_CODE = {
  unknown: 'PROMO_INVALID',
  expired: 'PROMO_EXPIRED',
  exhausted: 'PROMO_EXHAUSTED',
  alreadyRedeemed: 'PROMO_ALREADY_REDEEMED'
} as const satisfies Record<PromoRejection, ApiErrorCode>;

export const PROMO_RESERVATION = {
  minutes: 60,
  releaseBatch: 200
} as const;

export const ENTITLEMENTS = {
  cacheTtlMs: 60_000,
  cacheMaxEntries: 10_000,
  channel: 'otmetki:billing:entitlements',
  separator: '|'
} as const;
