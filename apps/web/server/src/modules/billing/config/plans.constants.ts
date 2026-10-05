import { BRAND } from '@otmetki/schemas';

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
