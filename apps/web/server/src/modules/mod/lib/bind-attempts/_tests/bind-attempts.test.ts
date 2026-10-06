import { describe, expect, it } from 'vitest';

import { BIND_CODE } from '../../../config/bind-code.constants';
import { bindAttemptCounters } from '../bind-attempts';

const keysOf = (input: Parameters<typeof bindAttemptCounters>[0]) => bindAttemptCounters(input).map(({ key }) => key);

describe('bindAttemptCounters', () => {
  it('gives two players behind one address separate counters when they bind different accounts', () => {
    const first = keysOf({ requester: '203.0.113.7', accountId: 1001 });
    const second = keysOf({ requester: '203.0.113.7', accountId: 1002 });

    expect(first.some((key) => second.includes(key))).toBe(false);
  });

  it('shares the account counter between every address guessing for that account', () => {
    const first = keysOf({ requester: '203.0.113.7', accountId: 1001 });
    const second = keysOf({ requester: '198.51.100.9', accountId: 1001 });

    expect(first.filter((key) => second.includes(key))).toEqual([`${BIND_CODE.accountFailurePrefix}1001`]);
  });

  it('groups an IPv6 requester by its /64 network', () => {
    const first = keysOf({ requester: '2001:db8:1:2::1', accountId: 1001 });
    const second = keysOf({ requester: '2001:db8:1:2:ffff::9', accountId: 1001 });

    expect(first).toEqual(second);
  });

  it('keeps the strict per-address counter for a request that names no account', () => {
    const counters = bindAttemptCounters({ requester: '203.0.113.7', accountId: undefined });

    expect(counters).toEqual([{ key: `${BIND_CODE.failurePrefix}203.0.113.7:${BIND_CODE.anyAccount}`, limit: BIND_CODE.maxFailuresPerRequester }]);
  });

  it('allows an account more failures in total than one address, so one address cannot lock it alone', () => {
    const limits = bindAttemptCounters({ requester: '203.0.113.7', accountId: 1001 }).map(({ limit }) => limit);

    expect(limits).toEqual([BIND_CODE.maxFailuresPerRequester, BIND_CODE.maxFailuresPerAccount]);
    expect(BIND_CODE.maxFailuresPerAccount).toBeGreaterThan(BIND_CODE.maxFailuresPerRequester);
  });
});
