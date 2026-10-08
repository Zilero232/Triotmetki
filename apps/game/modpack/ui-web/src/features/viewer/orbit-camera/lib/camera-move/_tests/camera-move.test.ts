import { describe, expect, it } from 'vitest';

import { dragMove, wheelMove } from '..';

describe('dragMove', () => {
  it('turns the camera by the distance the mouse moved', () => {
    expect(dragMove({ from: { x: 100, y: 50 }, to: { x: 112, y: 46 } })).toEqual({ dx: 12, dy: -4, dz: 0 });
  });

  it('sends nothing when the mouse stayed put', () => {
    expect(dragMove({ from: { x: 5, y: 5 }, to: { x: 5, y: 5 } })).toBeNull();
  });
});

describe('wheelMove', () => {
  it('zooms in when the wheel turns up', () => {
    expect(wheelMove(-3)?.dz).toBe(200);
  });

  it('zooms out when the wheel turns down', () => {
    expect(wheelMove(120)?.dz).toBe(-200);
  });

  it('sends nothing without a wheel turn', () => {
    expect(wheelMove(0)).toBeNull();
  });
});
