import type { FigureChunk } from './hud-figures.types';

import { HUD_FORMAT } from '../hud-format';

const isDigit = (char: string): boolean => char >= '0' && char <= '9';

export const figureChunks = (text: string): FigureChunk[] =>
  Array.from(text).map((char, index) => ({
    key: `${String(index)}-${char}`,
    text: char === ' ' ? HUD_FORMAT.noBreakSpace : char,
    digit: isDigit(char)
  }));
