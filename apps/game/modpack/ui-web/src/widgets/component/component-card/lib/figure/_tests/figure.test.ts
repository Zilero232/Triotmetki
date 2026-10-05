import { describe, expect, it } from 'vitest';

import { figureSchema } from '@/shared/api/protocol';

import { percentBox, percentPoint } from '../figure';

const FIGURE = { shapes: [{ x: 0.2, y: 0.1, w: 0.6, h: 0.82 }], marks: [{ x: 0.5, y: 0.12, tone: 'pen' }] };

describe(percentBox, () => {
  it('turns a fraction box into CSS percentages', () => {
    expect(percentBox({ x: 0.2, y: 0.1, w: 0.6, h: 0.82 })).toEqual({ left: '20%', top: '10%', width: '60%', height: '82%' });
  });
});

describe(percentPoint, () => {
  it('keeps a mark inside the figure', () => {
    expect(percentPoint({ x: 1.4, y: -0.2 })).toEqual({ left: '100%', top: '0%' });
  });

  it('rounds a mark to a tenth of a percent', () => {
    expect(percentPoint({ x: 0.4955, y: 0.123 })).toEqual({ left: '49.6%', top: '12.3%' });
  });
});

describe('figureSchema', () => {
  it('accepts the schematic the battle hits page sends', () => {
    expect(figureSchema.safeParse(FIGURE).success).toBe(true);
  });

  it('refuses a mark with an unknown tone', () => {
    const aimMark = { ...FIGURE, marks: [{ x: 0, y: 0, tone: 'aim' }] };

    expect(figureSchema.safeParse(aimMark).success).toBe(false);
  });
});
