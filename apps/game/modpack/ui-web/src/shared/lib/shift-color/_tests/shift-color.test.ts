import { describe, expect, it } from 'vitest';

import { HUD_TONE_COLORS } from '@/shared/config';

import { shiftColor } from '../shift-color';

describe(shiftColor, () => {
  it('stays on the gold accent without a change', () => {
    expect(shiftColor({ delta: 0, span: 0.5 })).toBe(HUD_TONE_COLORS.gold.hex);
    expect(shiftColor({ delta: null, span: 0.5 })).toBe(HUD_TONE_COLORS.gold.hex);
  });

  it('reaches green and red at the span', () => {
    expect(shiftColor({ delta: 0.5, span: 0.5 })).toBe(HUD_TONE_COLORS.good.hex);
    expect(shiftColor({ delta: -2, span: 0.5 })).toBe(HUD_TONE_COLORS.bad.hex);
  });

  it('blends in between', () => {
    expect(shiftColor({ delta: 0.25, span: 0.5 })).not.toBe(HUD_TONE_COLORS.gold.hex);
  });
});
