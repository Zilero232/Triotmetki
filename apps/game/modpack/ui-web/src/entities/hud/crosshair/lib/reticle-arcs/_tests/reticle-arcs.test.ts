import { describe, expect, it } from 'vitest';

import { arcPath } from '../reticle-arcs';

describe(arcPath, () => {
  it('draws nothing for an empty bar', () => {
    expect(arcPath({ side: 'left', progress: 0, centre: 64 })).toBeNull();
  });

  it('fills the left arc from its bottom end upwards', () => {
    expect(arcPath({ side: 'left', progress: 1, centre: 64 })).toBe('M38.02 79A30 30 0 0 1 38.02 49');
  });

  it('fills the right arc from its bottom end upwards', () => {
    expect(arcPath({ side: 'right', progress: 0.5, centre: 64 })).toBe('M89.98 79A30 30 0 0 0 94 64');
  });

  it('clamps a progress above one', () => {
    expect(arcPath({ side: 'right', progress: 3, centre: 64 })).toBe(arcPath({ side: 'right', progress: 1, centre: 64 }));
  });
});
