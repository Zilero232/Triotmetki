import { describe, expect, it } from 'vitest';

import { armorAudience } from '../armor-audience';

describe('armorAudience', () => {
  it('trusts the audience the usage endpoint reports', () => {
    expect(armorAudience({ reported: 'plus', isSignedIn: true })).toBe('plus');
  });

  it('keeps a signed-in viewer free when the usage lookup failed', () => {
    expect(armorAudience({ reported: null, isSignedIn: true })).toBe('free');
  });

  it('treats a guest as anonymous when the usage lookup failed', () => {
    expect(armorAudience({ reported: null, isSignedIn: false })).toBe('anonymous');
  });
});
