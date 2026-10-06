import type { SpriteCellStyle, SpriteCellStyleInput } from './sprite-cell.types';

import { rem } from '../css-unit';

export const spriteCellStyle = ({ file, cell, grid, width, height }: SpriteCellStyleInput): SpriteCellStyle => ({
  width: rem(width),
  height: rem(height),
  backgroundImage: `url(${file})`,
  backgroundSize: `${rem(grid.columns * width)} ${rem(grid.rows * height)}`,
  backgroundPosition: `${rem(-cell.column * width)} ${rem(-cell.row * height)}`
});
