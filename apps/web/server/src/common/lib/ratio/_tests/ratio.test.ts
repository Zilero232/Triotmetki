import { describe, expect, it } from 'vitest';

import { clampPercent, clampPercentDelta, percentOf, ratio, winRatePercent, winRateShare } from '../ratio';

describe('ratio and percentOf', () => {
  it('has no value for a zero denominator', () => {
    expect(ratio({ value: 5, by: 0 })).toBeNull();
    expect(percentOf({ value: 5, by: 0 })).toBeNull();
  });

  it('divides by a positive denominator, keeping a zero numerator as zero', () => {
    expect(ratio({ value: 0, by: 4 })).toBe(0);
    expect(percentOf({ value: 1, by: 4 })).toBe(25);
  });

  it('caps a percentage at one hundred', () => {
    expect(percentOf({ value: 5, by: 4 })).toBe(100);
  });
});

describe('clampPercent', () => {
  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('has no value for %s', (value) => {
    expect(clampPercent(value)).toBeNull();
  });

  it('clamps into 0..100 and keeps the bounds and zero', () => {
    expect(clampPercent(-3)).toBe(0);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(140)).toBe(100);
  });
});

describe('clampPercentDelta', () => {
  it('keeps the sign and clamps into -100..100', () => {
    expect(clampPercentDelta(-140)).toBe(-100);
    expect(clampPercentDelta(-5)).toBe(-5);
    expect(clampPercentDelta(140)).toBe(100);
    expect(clampPercentDelta(null)).toBeNull();
  });
});

describe('winRatePercent', () => {
  it('has no value without battles', () => {
    expect(winRatePercent({ wins: 0, battles: 0 })).toBeNull();
  });

  it('is the share of wins on the 0..100 scale', () => {
    expect(winRatePercent({ wins: 13, battles: 25 })).toBe(52);
  });

  it('keeps zero wins as zero', () => {
    expect(winRatePercent({ wins: 0, battles: 7 })).toBe(0);
  });
});

describe('winRateShare', () => {
  it('has no value without battles', () => {
    expect(winRateShare({ wins: 0, battles: 0 })).toBeNull();
  });

  it('is the share of wins on the 0..1 scale', () => {
    expect(winRateShare({ wins: 13, battles: 25 })).toBe(0.52);
  });

  it('is the percent divided by one hundred', () => {
    const counts = { wins: 7, battles: 9 };

    expect(winRateShare(counts)).toBeCloseTo((winRatePercent(counts) ?? 0) / 100, 12);
  });
});
