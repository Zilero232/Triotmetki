import { describe, expect, it } from 'vitest';

import { SPEC_DIRECTION } from '../../config/patches.constants';
import { toPatchChanges } from '../tank-patches.mappers';

const [higher = ''] = SPEC_DIRECTION.higher;

describe('toPatchChanges', () => {
  it('fills a missing side with null and attaches the effect', () => {
    expect(toPatchChanges([{ path: higher, after: 2 }])).toEqual([{ key: higher, before: null, after: 2, effect: 'neutral' }]);
  });

  it('keeps a zero value as zero', () => {
    const [change] = toPatchChanges([{ path: higher, before: 0, after: 1 }]);

    expect(change?.before).toBe(0);
    expect(change?.effect).toBe('better');
  });
});
