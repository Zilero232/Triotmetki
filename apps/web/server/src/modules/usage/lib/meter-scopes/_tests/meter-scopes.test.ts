import { usageLimit } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { USAGE_METER } from '../../../config/usage-meter.constants';
import { meterScopes, meterState } from '../meter-scopes';

const ANONYMOUS = { userId: null, deviceId: 'device-1', ipHash: 'ip-1' };
const SIGNED_IN = { userId: 'user-1', deviceId: null, ipHash: 'ip-1' };

describe('meterScopes', () => {
  it('meters a signed-in user by the account alone, whatever the network', () => {
    expect(meterScopes({ meter: 'armor3d', audience: 'free', actor: SIGNED_IN })).toEqual([
      { id: 'user:user-1', limit: usageLimit({ meter: 'armor3d', audience: 'free' }) }
    ]);
  });

  it('meters an anonymous visitor by the device and, more loosely, by the network', () => {
    const limit = usageLimit({ meter: 'armor3d', audience: 'anonymous' }) ?? 0;

    expect(meterScopes({ meter: 'armor3d', audience: 'anonymous', actor: ANONYMOUS })).toEqual([
      { id: 'device:device-1', limit },
      { id: 'ip:ip-1', limit: limit * USAGE_METER.anonymousIpFactor }
    ]);
  });

  it('still meters an anonymous visitor who refuses the device cookie by the network', () => {
    expect(meterScopes({ meter: 'armor3d', audience: 'anonymous', actor: { ...ANONYMOUS, deviceId: null } }).map(({ id }) => id)).toEqual([
      'ip:ip-1'
    ]);
  });

  it('has no metered scope for Plus', () => {
    expect(meterScopes({ meter: 'armor3d', audience: 'plus', actor: SIGNED_IN })).toEqual([]);
  });
});

describe('meterState', () => {
  const scopes = [
    { id: 'device:device-1', limit: 3 },
    { id: 'ip:ip-1', limit: 9 }
  ];

  it('reports what the owner used and the tightest remaining scope', () => {
    expect(meterState({ meter: 'armor3d', scopes, counts: [1, 8] })).toMatchObject({ limit: 3, used: 1, remaining: 1 });
  });

  it('never reports a negative remainder or more use than the limit', () => {
    expect(meterState({ meter: 'armor3d', scopes, counts: [5, 12] })).toMatchObject({ used: 3, remaining: 0 });
  });

  it('reports nothing left when there is no scope to meter', () => {
    expect(meterState({ meter: 'armor3d', scopes: [], counts: [] })).toMatchObject({ limit: 0, remaining: 0 });
  });
});
