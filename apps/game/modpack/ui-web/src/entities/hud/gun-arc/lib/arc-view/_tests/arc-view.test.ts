import { describe, expect, it } from 'vitest';

import { arcView } from '../arc-view';

describe(arcView, () => {
  it('centres the gun dot on its place along the 120 px scale', () => {
    expect(arcView({ position: 0.5, centre: 0.5 }).gun).toBe(57);
  });

  it('puts the hull axis tick at its share of the scale', () => {
    expect(arcView({ position: 0.5, centre: 0.25 }).centre).toBe(30);
  });

  it('keeps the dot on the scale past a limit', () => {
    expect(arcView({ position: 1.4, centre: 0.5 }).gun).toBe(117);
  });
});
