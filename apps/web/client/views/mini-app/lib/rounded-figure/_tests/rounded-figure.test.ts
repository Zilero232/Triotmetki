import { describe, expect, it } from 'vitest';

import { roundedFigure } from '../rounded-figure';

describe('roundedFigure', () => {
  it('rounds a known value', () => {
    expect(roundedFigure(1234.6)).toBe(1235);
  });

  it('keeps a missing value missing instead of turning it into zero', () => {
    expect(roundedFigure(null)).toBeNull();
  });

  it('keeps a real zero', () => {
    expect(roundedFigure(0)).toBe(0);
  });
});
