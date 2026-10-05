import type { ApiTier } from '@otmetki/schemas';

export type KeyMetadata = {
  tier: ApiTier;
};

export type VerifyFailure = 'invalid' | 'quota' | 'revoked';

export type QuotaRetryAfterInput = {
  lastRefillAt: Date | null;
  createdAt: Date;
  refillInterval: number | null;
  now: Date;
};
