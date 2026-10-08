import type { SwatchInput, SwatchStyle } from './swatch.types';

import { ARMOR_PALETTE } from '../../config';
import { hatchColor, toneColor } from '../cell-code';

export const swatchStyle = ({ tone, mode, pattern = 0 }: SwatchInput): SwatchStyle => {
  const color = pattern > 0 ? hatchColor(pattern) : toneColor({ tone, mode });

  return { backgroundColor: color ?? ARMOR_PALETTE.swatch };
};
