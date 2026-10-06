import type { SpriteCell, SpriteCellStyle } from '../sprite-cell';
import type { SpriteCellInput, SpriteStyleInput } from './icon-sprite.types';

import { UI_ICONS } from '../../config';
import { spriteCellStyle } from '../sprite-cell';

export const spriteRowsPerTone = (): number => Math.ceil(UI_ICONS.names.length / UI_ICONS.columns);

export const spriteSize = () => ({ columns: UI_ICONS.columns, rows: spriteRowsPerTone() * UI_ICONS.tones.length });

export const spriteCell = ({ name, tone }: SpriteCellInput): SpriteCell => {
  const index = UI_ICONS.names.indexOf(name);
  const toneIndex = UI_ICONS.tones.indexOf(tone);

  return { column: index % UI_ICONS.columns, row: toneIndex * spriteRowsPerTone() + Math.floor(index / UI_ICONS.columns) };
};

export const spriteStyle = ({ name, tone, size }: SpriteStyleInput): SpriteCellStyle =>
  spriteCellStyle({ file: UI_ICONS.file, cell: spriteCell({ name, tone }), grid: spriteSize(), width: size, height: size });
