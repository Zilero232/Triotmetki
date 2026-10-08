import { describe, expect, it } from 'vitest';

import { distanceAt, fractionOf } from '..';

const LIMITS = [0, 600] as const;

describe(distanceAt, () => {
  it('reads the distance under the thumb in whole steps', () => {
    expect(distanceAt({ fraction: 0.4183, limits: LIMITS, step: 10 })).toBe(250);
  });

  it('holds a drag past the track at the far end', () => {
    expect(distanceAt({ fraction: 1.4, limits: LIMITS, step: 10 })).toBe(600);
  });

  it('holds a drag before the track at the near end', () => {
    expect(distanceAt({ fraction: -0.2, limits: LIMITS, step: 10 })).toBe(0);
  });
});

describe(fractionOf, () => {
  it('places a distance on the track', () => {
    expect(fractionOf({ value: 150, limits: LIMITS })).toBe(0.25);
  });

  it('places everything at the start of an empty range', () => {
    expect(fractionOf({ value: 150, limits: [100, 100] })).toBe(0);
  });
});
