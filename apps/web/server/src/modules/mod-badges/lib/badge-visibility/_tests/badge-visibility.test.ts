import { describe, expect, it } from 'vitest';

import { visibleAccounts } from '../badge-visibility';

describe('visibleAccounts', () => {
  it('shows an account whose devices reported the badge on', () => {
    const devices = [
      { accountId: 1n, badgeVisible: true },
      { accountId: 1n, badgeVisible: true },
      { accountId: 2n, badgeVisible: true }
    ];

    expect(visibleAccounts({ devices, hidden: new Set() })).toEqual([1n, 2n]);
  });

  it('hides an account when any of its devices reported the badge off', () => {
    const devices = [
      { accountId: 1n, badgeVisible: true },
      { accountId: 1n, badgeVisible: false }
    ];

    expect(visibleAccounts({ devices, hidden: new Set() })).toEqual([]);
  });

  it('never shows a device that has not reported the switch, an unbound device or a hidden player', () => {
    const devices = [
      { accountId: 1n, badgeVisible: null },
      { accountId: null, badgeVisible: true },
      { accountId: 3n, badgeVisible: true }
    ];

    expect(visibleAccounts({ devices, hidden: new Set([3n]) })).toEqual([]);
  });
});
