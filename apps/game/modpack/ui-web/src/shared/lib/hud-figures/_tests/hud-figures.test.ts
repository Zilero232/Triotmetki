import { describe, expect, it } from 'vitest';

import { figureChunks } from '../hud-figures';

describe(figureChunks, () => {
  it('marks every digit for a fixed-width cell', () => {
    expect(figureChunks('8,3 %').map((chunk) => chunk.digit)).toEqual([true, false, true, false, false]);
  });
});
