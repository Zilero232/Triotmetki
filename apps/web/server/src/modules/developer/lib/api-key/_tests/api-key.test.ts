import { describe, expect, it } from 'vitest';

import { API_KEY_POLICY } from '../../../config/api-keys.constants';
import { keyTierOf, quotaRetryAfterSec, tierMetadata, verifyFailureOf } from '../api-key';

const createdAt = new Date('2026-09-25T10:00:00Z');

describe('keyTierOf', () => {
  it('reads the tier from stored JSON and from a parsed object', () => {
    expect(keyTierOf('{"tier":"community"}')).toBe('community');
    expect(keyTierOf({ tier: 'plus' })).toBe('plus');
  });

  it('answers null for missing or malformed metadata', () => {
    expect(keyTierOf(null)).toBeNull();
    expect(keyTierOf('{not json')).toBeNull();
    expect(keyTierOf({ tier: 'gold' })).toBeNull();
  });
});

describe('tierMetadata', () => {
  it('stores only the tier on the key, leaving the daily budget to the Redis limiter', () => {
    expect(tierMetadata('plus')).toEqual({ tier: 'plus' });
  });
});

describe('verifyFailureOf', () => {
  it('tells an exhausted quota, a revoked key and an unknown key apart', () => {
    expect(verifyFailureOf('USAGE_EXCEEDED')).toBe('quota');
    expect([...API_KEY_POLICY.revokedCodes].map(verifyFailureOf)).toEqual([...API_KEY_POLICY.revokedCodes].map(() => 'revoked'));
    expect(verifyFailureOf('INVALID_API_KEY')).toBe('invalid');
    expect(verifyFailureOf(undefined)).toBe('invalid');
  });
});

describe('quotaRetryAfterSec', () => {
  it('waits until the next refill', () => {
    const now = new Date(createdAt.getTime() + API_KEY_POLICY.quotaRefillMs - 90_000);

    expect(quotaRetryAfterSec({ lastRefillAt: null, createdAt, refillInterval: API_KEY_POLICY.quotaRefillMs, now })).toBe(90);
  });

  it('asks for at least one second once the refill is due', () => {
    const now = new Date(createdAt.getTime() + 2 * API_KEY_POLICY.quotaRefillMs);

    expect(quotaRetryAfterSec({ lastRefillAt: createdAt, createdAt, refillInterval: API_KEY_POLICY.quotaRefillMs, now })).toBe(1);
  });
});
