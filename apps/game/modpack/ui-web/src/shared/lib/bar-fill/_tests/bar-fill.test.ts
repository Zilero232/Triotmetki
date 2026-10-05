import { describe, expect, it } from 'vitest';

import { barFill } from '../bar-fill';

describe(barFill, () => {
  it('fills the bar by the share of the maximum', () => {
    expect(barFill({ value: 50, max: 100, width: 40 })).toBe(20);
  });

  it('never fills past the full width', () => {
    expect(barFill({ value: 500, max: 100, width: 40 })).toBe(40);
  });

  it('stays empty without a maximum', () => {
    expect(barFill({ value: 5, max: 0, width: 40 })).toBe(0);
  });
});
