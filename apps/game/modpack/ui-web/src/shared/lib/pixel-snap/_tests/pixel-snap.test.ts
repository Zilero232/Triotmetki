import { describe, expect, it } from 'vitest';

import { snapToDevice } from '../pixel-snap';

describe(snapToDevice, () => {
  it('rounds to whole design px at an interface scale of 1', () => {
    expect(snapToDevice({ value: 426.6, ratio: 1 })).toBe(427);
  });

  it('lands on a whole device px at a fractional interface scale', () => {
    const snapped = snapToDevice({ value: 427, ratio: 1.5 });

    expect(Math.abs(snapped * 1.5 - Math.round(snapped * 1.5))).toBeLessThan(0.001);
    expect(snapped).toBe(427.3333);
  });

  it('keeps quarter steps at an interface scale of 1.25', () => {
    expect(snapToDevice({ value: 101, ratio: 1.25 })).toBe(100.8);
  });

  it('falls back to whole design px without a usable scale', () => {
    expect(snapToDevice({ value: 10.6, ratio: 0 })).toBe(11);
  });
});
