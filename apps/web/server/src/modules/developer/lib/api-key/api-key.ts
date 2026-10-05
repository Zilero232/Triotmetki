import type { ApiTier } from '@otmetki/schemas';

import { apiTierSchema } from '@otmetki/schemas';
import { addMilliseconds, differenceInSeconds } from 'date-fns';
import { z } from 'zod';

import type { KeyMetadata, QuotaRetryAfterInput, VerifyFailure } from './api-key.types';

import { API_KEY_POLICY } from '../../config/api-keys.constants';

const keyMetadataSchema = z.object({ tier: apiTierSchema });

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const keyTierOf = (metadata: unknown): ApiTier | null => {
  const parsed = keyMetadataSchema.safeParse(typeof metadata === 'string' ? parseJson(metadata) : metadata);

  return parsed.success ? parsed.data.tier : null;
};

export const tierMetadata = (tier: ApiTier): KeyMetadata => ({ tier });

export const verifyFailureOf = (code: string | undefined): VerifyFailure => {
  if (API_KEY_POLICY.quotaCodes.has(code ?? '')) {
    return 'quota';
  }

  return API_KEY_POLICY.revokedCodes.has(code ?? '') ? 'revoked' : 'invalid';
};

export const quotaRetryAfterSec = ({ lastRefillAt, createdAt, refillInterval, now }: QuotaRetryAfterInput): number => {
  const refillAt = addMilliseconds(lastRefillAt ?? createdAt, refillInterval ?? API_KEY_POLICY.quotaRefillMs);

  return Math.max(1, differenceInSeconds(refillAt, now, { roundingMethod: 'ceil' }));
};
