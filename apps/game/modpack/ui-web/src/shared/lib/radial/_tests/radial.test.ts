import { describe, expect, it } from 'vitest';

import { radialArc } from '../radial';

describe(radialArc, () => {
  it("starts at twelve o'clock and runs clockwise without an SVG transform", () => {
    expect(radialArc({ progress: 0.25, radius: 10, centre: 12 })).toBe('M12 2A10 10 0 0 1 22 12');
  });

  it('takes the long way round past half', () => {
    expect(radialArc({ progress: 0.75, radius: 10, centre: 12 })).toBe('M12 2A10 10 0 1 1 2 12');
  });

  it('closes the whole ring in two half arcs on the same circle', () => {
    expect(radialArc({ progress: 2, radius: 10, centre: 12 })).toBe('M12 2A10 10 0 1 1 12 22A10 10 0 1 1 12 2');
  });

  it('draws nothing before the start', () => {
    expect(radialArc({ progress: -1, radius: 10, centre: 12 })).toBe('');
  });
});
