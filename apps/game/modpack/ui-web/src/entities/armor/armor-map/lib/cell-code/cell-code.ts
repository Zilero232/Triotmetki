import type { CellCode, HatchInput, ToneColorInput } from './cell-code.types';

import { ARMOR_MAP, ARMOR_PALETTE, FIXED_TONE_COLORS, HATCH_COLORS } from '../../config';

export const decodeCell = (char: string): CellCode => {
  const code = Math.max(ARMOR_MAP.empty, ARMOR_MAP.alphabet.indexOf(char));

  return { tone: code % ARMOR_MAP.patternStep, pattern: Math.floor(code / ARMOR_MAP.patternStep) };
};

export const toneColor = ({ tone, mode }: ToneColorInput): string | null => {
  const fixed = FIXED_TONE_COLORS[tone];

  if (fixed) {
    return fixed;
  }

  const palette: readonly string[] = mode === 'shell' ? ARMOR_PALETTE.shell : ARMOR_PALETTE.thickness;

  return palette[tone - 1] ?? null;
};

export const hatchColor = (pattern: number): string | null => HATCH_COLORS[pattern] ?? null;

export const isHatched = ({ col, row, pattern }: HatchInput): boolean => {
  const period = ARMOR_MAP.hatchPeriod;

  if (pattern === ARMOR_MAP.pattern.screen) {
    return (col + row) % period === 0;
  }

  if (pattern === ARMOR_MAP.pattern.track) {
    const offset = (col - row) % period;

    return (offset + period) % period === 0;
  }

  return false;
};
