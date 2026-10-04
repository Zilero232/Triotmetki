import { describe, expect, it } from 'vitest';

import { sparkline } from '../hud-sparkline';

describe(sparkline, () => {
  it('draws nothing for fewer than two points', () => {
    expect(sparkline({ points: [1], width: 60, height: 16, inset: 2 })).toEqual({ path: '', last: null });
  });

  it('puts the highest point at the top and ends at the newest', () => {
    const view = sparkline({ points: [1, 3, 2], width: 60, height: 16, inset: 2 });

    expect(view.path).toBe('M2 14 L30 2 L58 8');
    expect(view.last).toEqual({ x: 58, y: 8 });
  });
});
