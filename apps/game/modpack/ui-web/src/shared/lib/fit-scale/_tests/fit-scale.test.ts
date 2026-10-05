import { describe, expect, it } from 'vitest';

import { fitPlacement, fitScale } from '../fit-scale';

describe(fitScale, () => {
  it('keeps content that fits at its own size', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 200, height: 40 } })).toBe(1);
  });

  it('shrinks wide content to the frame width', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 800, height: 40 } })).toBe(0.5);
  });

  it('shrinks tall content to the frame height', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 200, height: 400 } })).toBe(0.25);
  });

  it('leaves content alone until it is measured', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 0, height: 0 } })).toBe(1);
  });
});

describe('fitScale with a larger limit', () => {
  it('grows small content up to the limit', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 100, height: 20 }, max: 2 })).toBe(2);
  });

  it('grows it only as far as the frame allows', () => {
    expect(fitScale({ frame: { width: 400, height: 100 }, content: { width: 100, height: 80 }, max: 2 })).toBe(1.25);
  });
});

describe(fitPlacement, () => {
  it('centres scaled content in the frame', () => {
    const placement = fitPlacement({ frame: { width: 400, height: 100 }, content: { width: 800, height: 40 } });

    expect(placement).toEqual({ scale: 0.5, x: 0, y: 40, measured: true });
  });

  it('centres content that fits at its own size', () => {
    const placement = fitPlacement({ frame: { width: 400, height: 100 }, content: { width: 200, height: 40 } });

    expect(placement).toEqual({ scale: 1, x: 100, y: 30, measured: true });
  });

  it('reports unmeasured content until the engine laid it out', () => {
    const placement = fitPlacement({ frame: { width: 400, height: 100 }, content: { width: 0, height: 0 } });

    expect(placement.measured).toBe(false);
  });
});
