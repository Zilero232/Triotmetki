import { describe, expect, it } from 'vitest';

import { bioHasCode, newClaimCode } from '../claim-code';

describe('newClaimCode', () => {
  it('has the prefix and six hex chars', () => {
    expect(newClaimCode()).toMatch(/^otmetki-[\da-f]{6}$/u);
  });
});

describe('bioHasCode', () => {
  it('finds the code case-insensitively', () => {
    expect(bioHasCode({ bio: 'Стримы по танкам. OTMETKI-A1B2C3', code: 'otmetki-a1b2c3' })).toBe(true);
    expect(bioHasCode({ bio: null, code: 'otmetki-a1b2c3' })).toBe(false);
    expect(bioHasCode({ bio: 'otmetki-000000', code: 'otmetki-a1b2c3' })).toBe(false);
  });
});
