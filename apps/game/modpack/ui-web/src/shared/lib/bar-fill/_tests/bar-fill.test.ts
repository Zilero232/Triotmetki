import { describe, expect, it } from 'vitest';

import { barFill, fillScaleStyle, slideStyle } from '../bar-fill';

describe(barFill, () => {
  it('fills the bar by the share of the maximum', () => {
    expect(barFill({ value: 50, max: 100, width: 40 })).toBe(20);
  });

  it('never fills past the full width', () => {
    expect(barFill({ value: 500, max: 100, width: 40 })).toBe(40);
  });

  it('stays empty without a maximum', () => {
    expect(barFill({ value: 5, max: 0, width: 40 })).toBe(0);
  });
});

describe(fillScaleStyle, () => {
  it('scales the full-width fill to the share', () => {
    expect(fillScaleStyle(0.25)).toEqual({ transform: 'scaleX(0.25)' });
  });

  it('never scales past the full width', () => {
    expect(fillScaleStyle(1.5)).toEqual({ transform: 'scaleX(1)' });
  });

  it('stays empty for a share of an empty bar', () => {
    expect(fillScaleStyle(0 / 0)).toEqual({ transform: 'scaleX(0)' });
  });
});

describe(slideStyle, () => {
  it('slides a full-width track to the percent', () => {
    expect(slideStyle(42.5)).toEqual({ transform: 'translateX(42.5%)' });
  });

  it('keeps the slide on the track', () => {
    expect(slideStyle(-3)).toEqual({ transform: 'translateX(0%)' });
  });
});
