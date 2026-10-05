import { NUMBER_FORMAT } from '@/shared/lib/format-number';

import type { FigureChunk } from './figure-chunks.types';

const isDigit = (char: string): boolean => char >= '0' && char <= '9';

export const figureChunks = (text: string): FigureChunk[] =>
  Array.from(text).map((char, index) => ({
    key: `${String(index)}-${char}`,
    text: char === ' ' ? NUMBER_FORMAT.noBreakSpace : char,
    digit: isDigit(char)
  }));
