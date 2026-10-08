import { describe, expect, it } from 'vitest';

import { BIND_CODE } from '../../../config/bind-code.constants';
import { bindAttemptCounters } from '../bind-attempts';

describe('bindAttemptCounters', () => {
  it('gives two players behind one address separate counters when they bind different accounts', () => {
    const first = bindAttemptCounters({ requester: '203.0.113.7', accountId: 1001 });
    const second = bindAttemptCounters({ requester: '203.0.113.7', accountId: 1002 });

    expect(first.requester.key).not.toBe(second.requester.key);
  });

  it('shares the account counter between every address binding that account', () => {
    const first = bindAttemptCounters({ requester: '203.0.113.7', accountId: 1001 });
    const second = bindAttemptCounters({ requester: '198.51.100.9', accountId: 1001 });

    expect(first.account?.key).toBe(second.account?.key);
  });

  it('keys the account counter by the account alone', () => {
    const counters = bindAttemptCounters({ requester: '203.0.113.7', accountId: 1001 });

    expect(counters.account?.key).toBe(`${BIND_CODE.accountFailurePrefix}1001`);
  });

  it('groups an IPv6 requester by its /64 network', () => {
    const first = bindAttemptCounters({ requester: '2001:db8:1:2::1', accountId: 1001 });
    const second = bindAttemptCounters({ requester: '2001:db8:1:2:ffff::9', accountId: 1001 });

    expect(first).toEqual(second);
  });

  it('keeps the strict per-address counter for a request that names no account', () => {
    const counters = bindAttemptCounters({ requester: '203.0.113.7', accountId: undefined });

    expect(counters).toEqual({
      requester: { key: `${BIND_CODE.failurePrefix}203.0.113.7:${BIND_CODE.anyAccount}`, limit: BIND_CODE.maxFailuresPerRequester },
      account: null
    });
  });

  it('allows an account more refusals in total than one address, so one address cannot lock it alone', () => {
    expect(BIND_CODE.maxFailuresPerAccount).toBeGreaterThan(BIND_CODE.maxFailuresPerRequester);
  });
});
