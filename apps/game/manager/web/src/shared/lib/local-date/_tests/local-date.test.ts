import { describe, expect, it } from 'vitest';

import { fromUnixSeconds } from '../local-date';

describe('fromUnixSeconds', () => {
  it('reads the fractional seconds the game writes into profiles.json', () => {
    expect(fromUnixSeconds(1.5)?.getTime()).toBe(1_500);
  });

  it('has no date without seconds', () => {
    expect(fromUnixSeconds(null)).toBeNull();
  });
});
