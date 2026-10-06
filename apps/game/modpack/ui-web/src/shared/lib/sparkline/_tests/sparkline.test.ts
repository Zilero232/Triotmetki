import { describe, expect, it } from 'vitest';

import { dotPath, sparkline } from '../sparkline';

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

describe(dotPath, () => {
  it('draws the dot as two arcs around its centre, as Gameface draws no circle element', () => {
    expect(dotPath({ x: 10, y: 5, radius: 2 })).toBe('M8 5 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0z');
  });
});
