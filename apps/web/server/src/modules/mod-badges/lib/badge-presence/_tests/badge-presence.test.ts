import { describe, expect, it } from 'vitest';

import { MOD_BADGE_PRESENCE } from '../../../config/badge-presence.constants';
import { ipQuotaSubject, presenceTracker, presentAccounts } from '../badge-presence';

const SECRET = 'server-secret-for-tests';

describe('presenceTracker', () => {
  it('counts every address of one IPv6 subnet as one client', () => {
    expect(presenceTracker({ ip: '2001:db8:0:1::1' })).toBe(presenceTracker({ ip: '2001:db8:0:1::2' }));
  });

  it('keeps two IPv4 clients apart', () => {
    expect(presenceTracker({ ip: '203.0.113.1' })).not.toBe(presenceTracker({ ip: '203.0.113.2' }));
  });
});

describe('ipQuotaSubject', () => {
  it('never stores the client address itself', () => {
    expect(ipQuotaSubject({ ip: '203.0.113.7', secret: SECRET })).not.toContain('203.0.113.7');
  });

  it('maps one client to one subject and two clients to two', () => {
    expect(ipQuotaSubject({ ip: '203.0.113.7', secret: SECRET })).toBe(ipQuotaSubject({ ip: '203.0.113.7', secret: SECRET }));
    expect(ipQuotaSubject({ ip: '203.0.113.7', secret: SECRET })).not.toBe(ipQuotaSubject({ ip: '203.0.113.8', secret: SECRET }));
  });

  it('keeps the address quota apart from the device quotas', () => {
    expect(ipQuotaSubject({ ip: '203.0.113.7', secret: SECRET }).startsWith(MOD_BADGE_PRESENCE.ipSubjectPrefix)).toBe(true);
  });
});

describe('presentAccounts', () => {
  it('keeps the asked accounts that have a presence flag, in the asked order', () => {
    expect(presentAccounts({ accountIds: [3, 1, 2], flags: ['1', null, '1'], hidden: new Set() })).toEqual([3, 2]);
  });

  it('never shows a hidden player, whatever its mod reported', () => {
    expect(presentAccounts({ accountIds: [3], flags: ['1'], hidden: new Set([3n]) })).toEqual([]);
  });

  it('answers nothing for a battle without flags', () => {
    expect(presentAccounts({ accountIds: [1, 2], flags: [null, null], hidden: new Set() })).toEqual([]);
  });
});
