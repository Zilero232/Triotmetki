import type { ApiErrorCode } from '@otmetki/schemas';

import type { PromoRejection } from '../lib/promo-check';

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
