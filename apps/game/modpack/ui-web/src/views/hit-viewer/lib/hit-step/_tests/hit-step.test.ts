import { describe, expect, it } from 'vitest';

import { hitStep } from '..';

describe('hitStep', () => {
  it('moves to the next hit of the list', () => {
    expect(hitStep({ indexes: [2, 5, 9], selected: 5, step: 1 })).toBe(9);
  });

  it('wraps from the last hit to the first', () => {
    expect(hitStep({ indexes: [2, 5, 9], selected: 9, step: 1 })).toBe(2);
  });

  it('wraps from the first hit back to the last', () => {
    expect(hitStep({ indexes: [2, 5, 9], selected: 2, step: -1 })).toBe(9);
  });

  it('starts at the first hit when none is selected', () => {
    expect(hitStep({ indexes: [2, 5, 9], selected: null, step: -1 })).toBe(2);
  });

  it('gives nothing for an empty list', () => {
    expect(hitStep({ indexes: [], selected: null, step: 1 })).toBeNull();
  });
});
