import { describe, expect, it } from 'vitest';

import { MOD_BADGE_PRESENCE } from '../../../config/badge-presence.constants';
import { ipQuotaSubjects, presenceTracker, presentAccounts } from '../badge-presence';

const SECRET = 'server-secret-for-tests';

describe('presenceTracker', () => {
  it('counts every address of one IPv6 subnet as one client', () => {
    expect(presenceTracker({ ip: '2001:db8:0:1::1' })).toBe(presenceTracker({ ip: '2001:db8:0:1::2' }));
  });

  it('keeps two IPv4 clients apart', () => {
    expect(presenceTracker({ ip: '203.0.113.1' })).not.toBe(presenceTracker({ ip: '203.0.113.2' }));
  });
});

describe('ipQuotaSubjects', () => {
  it('never stores the client address itself', () => {
    const [subject] = ipQuotaSubjects({ ip: '203.0.113.7', secret: SECRET });

    expect(subject).not.toContain('203.0.113.7');
  });

  it('maps one IPv4 client to one subject', () => {
    expect(ipQuotaSubjects({ ip: '203.0.113.7', secret: SECRET })).toHaveLength(1);
  });

  it('keeps two IPv4 clients apart', () => {
    const first = ipQuotaSubjects({ ip: '203.0.113.7', secret: SECRET });
    const second = ipQuotaSubjects({ ip: '203.0.113.8', secret: SECRET });

    expect(first).not.toEqual(second);
  });

  it('counts an IPv6 client against its /56 and its /48', () => {
    expect(ipQuotaSubjects({ ip: '2001:db8:1:2::1', secret: SECRET })).toHaveLength(2);
  });

  it('shares the /48 subject between two /56 networks of one /48', () => {
    const [, first] = ipQuotaSubjects({ ip: '2001:db8:1:100::1', secret: SECRET });
    const [, second] = ipQuotaSubjects({ ip: '2001:db8:1:ff00::1', secret: SECRET });

    expect(first).toBe(second);
  });

  it('keeps the /56 subjects of two networks of one /48 apart', () => {
    const [first] = ipQuotaSubjects({ ip: '2001:db8:1:100::1', secret: SECRET });
    const [second] = ipQuotaSubjects({ ip: '2001:db8:1:ff00::1', secret: SECRET });

    expect(first).not.toBe(second);
  });

  it('keeps the address quota apart from the device quotas', () => {
    const [subject] = ipQuotaSubjects({ ip: '203.0.113.7', secret: SECRET });

    expect(subject?.startsWith(MOD_BADGE_PRESENCE.ipSubjectPrefix)).toBe(true);
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
