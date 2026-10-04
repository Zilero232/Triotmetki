import { describe, expect, it } from 'vitest';

import { isSilhouetteShape, onSilhouette, polygonPath, silhouetteOf } from '../hud-silhouette';

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10]
] as const;

describe(polygonPath, () => {
  it('closes the outline', () => {
    expect(polygonPath(square)).toBe('M0 0 L10 0 L10 10 L0 10 Z');
  });
});

describe(silhouetteOf, () => {
  it('falls back to the medium tank for an unknown class', () => {
    expect(silhouetteOf('boat')).toBe(silhouetteOf('medium'));
    expect(isSilhouetteShape('heavy')).toBe(true);
    expect(isSilhouetteShape(null)).toBe(false);
  });
});

describe(onSilhouette, () => {
  it('maps 0 and 100 % to the ends of the outline, not of the box', () => {
    expect(onSilhouette({ points: square, value: 0 })).toBe(0);
    expect(onSilhouette({ points: square, value: 100 })).toBe(8.33);
  });
});
