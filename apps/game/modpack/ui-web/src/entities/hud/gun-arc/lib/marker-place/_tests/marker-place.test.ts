import { describe, expect, it } from 'vitest';

import { GUN_ARC } from '../../../config';
import { markerPlace } from '../marker-place';

const { canvas, box } = GUN_ARC;

describe(markerPlace, () => {
  it('centres a marker on the reticle at no offset', () => {
    expect(markerPlace({ x: 0, y: 0 })).toEqual({ left: (canvas.width - box.width) / 2, top: (canvas.height - box.height) / 2 });
  });

  it('moves a marker by its offset from the reticle', () => {
    const centred = markerPlace({ x: 0, y: 0 });

    expect(markerPlace({ x: -212, y: 2 })).toEqual({ left: centred.left - 212, top: centred.top + 2 });
  });
});
