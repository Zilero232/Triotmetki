import { describe, expect, it } from 'vitest';

import { sketchRing } from '../sketch-ring';

describe(sketchRing, () => {
  it('draws the game circle at its own size', () => {
    expect(sketchRing(100)).toStrictEqual({ top: '20%', left: '20%', width: '60%', height: '60%' });
  });

  it('draws a smaller circle around the same centre', () => {
    expect(sketchRing(60)).toStrictEqual({ top: '32%', left: '32%', width: '36%', height: '36%' });
  });
});
