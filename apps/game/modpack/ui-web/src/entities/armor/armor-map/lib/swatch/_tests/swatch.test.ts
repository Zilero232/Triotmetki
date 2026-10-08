import { describe, expect, it } from 'vitest';

import { ARMOR_PALETTE } from '../../../config';
import { swatchStyle } from '../swatch';

describe(swatchStyle, () => {
  it('paints a tone in its mode colour', () => {
    expect(swatchStyle({ tone: 7, mode: 'shell' })).toEqual({ backgroundColor: ARMOR_PALETTE.shell[6] });
  });

  it('paints a hatch in its pattern colour', () => {
    expect(swatchStyle({ tone: 0, mode: 'nominal', pattern: 2 })).toEqual({ backgroundColor: ARMOR_PALETTE.hatch[2] });
  });

  it('falls back to the neutral swatch without a colour', () => {
    expect(swatchStyle({ tone: 0, mode: 'nominal' })).toEqual({ backgroundColor: ARMOR_PALETTE.swatch });
  });
});
