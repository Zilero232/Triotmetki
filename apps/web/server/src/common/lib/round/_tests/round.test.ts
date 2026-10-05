import { describe, expect, it } from 'vitest';

import { roundTo } from '../round';

describe('roundTo', () => {
  it('rounds to the given number of decimals', () => {
    expect(roundTo({ value: 52.345, digits: 1 })).toBe(52.3);
    expect(roundTo({ value: 0.126, digits: 2 })).toBe(0.13);
  });

  it('rounds to a whole number with zero digits', () => {
    expect(roundTo({ value: 2.5, digits: 0 })).toBe(3);
  });

  it('matches the scale-and-divide rounding it replaces', () => {
    const value = 1234.5678;

    expect(roundTo({ value, digits: 1 })).toBe(Math.round(value * 10) / 10);
    expect(roundTo({ value, digits: 2 })).toBe(Math.round(value * 100) / 100);
  });
});
