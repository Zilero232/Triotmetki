import { describe, expect, it } from 'vitest';

import { GUN_ARC } from '../../../config';
import { markerPath } from '../marker-path';

const LIMIT_SHAPES = GUN_ARC.markers;

describe(markerPath, () => {
  it('opens the left corner towards the sector, its apex on the left', () => {
    expect(markerPath({ shape: 'corner', side: 'left' }).d).toBe('M14 8L6 16L14 24');
  });

  it('mirrors the right marker of every style that has a side', () => {
    const sided = LIMIT_SHAPES.filter((shape) => shape !== 'octagon');

    for (const shape of sided) {
      expect(markerPath({ shape, side: 'right' }).d).not.toBe(markerPath({ shape, side: 'left' }).d);
    }
  });

  it('turns a semicircle the other way on the right', () => {
    expect(markerPath({ shape: 'semicircle', side: 'right' }).d).toBe('M6 9A7 7 0 0 1 6 23');
  });

  it('draws the limit markers as outlines', () => {
    expect(LIMIT_SHAPES.map((shape) => markerPath({ shape, side: 'left' }).filled)).toEqual(LIMIT_SHAPES.map(() => false));
  });

  it('fills the dot and the triangle of the centre marker', () => {
    expect([markerPath({ shape: 'dot', side: 'centre' }).filled, markerPath({ shape: 'triangle', side: 'centre' }).filled]).toEqual([true, true]);
  });
});
