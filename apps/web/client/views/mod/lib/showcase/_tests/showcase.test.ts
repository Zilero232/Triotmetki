import { describe, expect, it } from 'vitest';

import { MOD_SHOWCASE } from '../../../config';
import { isBaseId, showcaseCount } from '../showcase';

describe('showcaseCount', () => {
  it('counts every showcased component once', () => {
    const total = MOD_SHOWCASE.reduce((sum, group) => sum + group.items.length, 0);

    expect(showcaseCount()).toBe(total);
  });
});

describe('isBaseId', () => {
  it('knows the core packages', () => {
    expect(isBaseId('companion')).toBe(true);
  });

  it('rejects a feature', () => {
    expect(isBaseId('marks_panel')).toBe(false);
  });
});
