import { describe, expect, it } from 'vitest';

import { figureChunks } from '../figure-chunks';

describe(figureChunks, () => {
  it('marks every digit for a fixed-width cell', () => {
    expect(figureChunks('8,3 %').map((chunk) => chunk.digit)).toEqual([true, false, true, false, false]);
  });

  it('keys every chunk by its place, so a changed digit keeps its cell', () => {
    const before = figureChunks('1 240').map((chunk) => chunk.key);
    const after = figureChunks('1 890').map((chunk) => chunk.key);

    expect(after).toEqual(before);
  });
});
