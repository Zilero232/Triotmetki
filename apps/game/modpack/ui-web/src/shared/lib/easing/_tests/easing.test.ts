import { describe, expect, it } from 'vitest';

import { easeOutCubic } from '../easing';

describe(easeOutCubic, () => {
  it('starts at zero', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('ends at one', () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it('covers most of the way by the middle', () => {
    expect(easeOutCubic(0.5)).toBe(0.875);
  });
});
