import { addDays, addHours, fromUnixTime } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { LestaApiError, LestaNetworkError } from '../../../../../lib/lesta';
import { LESTA_LINKS } from '../../../config/lesta-links.constants';
import { hasExpired, isTokenRejected, relinkDedupeKey, renewalDue, renewedExpiry } from '../token-renewal';

const now = new Date('2026-09-28T04:40:00Z');
const lestaMaxDays = 14;

describe('renewalDue', () => {
  it('renews a token inside the renewal window, including one on its boundary', () => {
    expect(renewalDue({ expiresAt: addDays(now, LESTA_LINKS.token.renewWithinDays), now })).toBe(true);
    expect(renewalDue({ expiresAt: addHours(now, 1), now })).toBe(true);
  });

  it('leaves a token with time to spare and one without an expiry', () => {
    expect(renewalDue({ expiresAt: addHours(addDays(now, LESTA_LINKS.token.renewWithinDays), 1), now })).toBe(false);
    expect(renewalDue({ expiresAt: null, now })).toBe(false);
  });
});

describe('hasExpired', () => {
  it('treats the exact expiry moment as expired', () => {
    expect(hasExpired({ expiresAt: now, now })).toBe(true);
    expect(hasExpired({ expiresAt: addHours(now, 1), now })).toBe(false);
  });
});

describe('renewedExpiry', () => {
  it('stays inside the two weeks Lesta allows and past the renewal window', () => {
    const renewed = fromUnixTime(renewedExpiry(now)).getTime();

    expect(renewed).toBeLessThanOrEqual(addDays(now, lestaMaxDays).getTime());
    expect(renewed).toBeGreaterThan(addDays(now, LESTA_LINKS.token.renewWithinDays).getTime());
  });
});

describe('isTokenRejected', () => {
  it('counts only an invalid-token answer, not an outage', () => {
    expect(isTokenRejected(new LestaApiError({ code: 'INVALID_ACCESS_TOKEN', method: 'auth/prolongate' }))).toBe(true);
    expect(isTokenRejected(new LestaApiError({ code: 'SOURCE_NOT_AVAILABLE', method: 'auth/prolongate' }))).toBe(false);
    expect(isTokenRejected(new LestaNetworkError({ method: 'auth/prolongate', cause: new Error('reset') }))).toBe(false);
  });
});

describe('relinkDedupeKey', () => {
  it('asks once per expired token and again after a relink with a new expiry', () => {
    const first = relinkDedupeKey({ accountId: 1n, expiresAt: now });

    expect(relinkDedupeKey({ accountId: 1n, expiresAt: now })).toBe(first);
    expect(relinkDedupeKey({ accountId: 1n, expiresAt: addDays(now, LESTA_LINKS.token.extendDays) })).not.toBe(first);
  });
});
