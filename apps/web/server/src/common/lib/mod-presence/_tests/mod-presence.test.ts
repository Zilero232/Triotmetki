import { describe, expect, it } from 'vitest';

import { modPresenceKey } from '../mod-presence';
import { MOD_PRESENCE } from '../mod-presence.constants';

describe('modPresenceKey', () => {
  it('keeps one key per account under the presence prefix', () => {
    expect(modPresenceKey(12_345_678)).toBe(`${MOD_PRESENCE.keyPrefix}12345678`);
  });

  it('builds the same key from a bigint account id as from a number', () => {
    expect(modPresenceKey(12_345_678n)).toBe(modPresenceKey(12_345_678));
  });
});
