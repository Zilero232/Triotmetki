import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS_AGGREGATE } from '../../../config/aggregate.constants';
import { accountRollup, heldNames, obtainableNames, readCounts } from '../account-rollup';

const points = new Map([
  ['common', 10],
  ['rare', 100],
  ['memorial', 400]
]);

const obtainable = new Set(['common', 'rare']);

describe('accountRollup', () => {
  it('sums points of held medals and ignores zero counts', () => {
    const rollup = accountRollup({ counts: { common: 3, rare: 0, memorial: 1 }, points, obtainable });

    expect(rollup.held).toBe(2);
    expect(rollup.points).toBe((points.get('common') ?? 0) + (points.get('memorial') ?? 0));
  });

  it('counts completion over the obtainable catalog only', () => {
    const partial = accountRollup({ counts: { common: 1, memorial: 1 }, points, obtainable });
    const full = accountRollup({ counts: { common: 1, rare: 2 }, points, obtainable });

    expect(partial.completion).toBeLessThan(full.completion);
    expect(full.completion).toBe(100);
  });

  it('skips medals the catalog does not know', () => {
    expect(accountRollup({ counts: { unknown: 5 }, points, obtainable })).toEqual({ held: 0, points: 0, completion: 0 });
  });

  it('reports no completion for an empty catalog', () => {
    expect(accountRollup({ counts: { common: 1 }, points, obtainable: new Set() }).completion).toBe(0);
  });
});

describe('readCounts', () => {
  it('falls back to an empty record on malformed input', () => {
    expect(readCounts('nope')).toEqual({});
    expect(readCounts({ a: 1 })).toEqual({ a: 1 });
  });
});

describe('heldNames', () => {
  it('keeps positive counts only', () => {
    expect(heldNames({ a: 0, b: 2 })).toEqual(['b']);
  });
});

describe('obtainableNames', () => {
  it('keeps only medals from the completion sections', () => {
    const [section] = ACHIEVEMENTS_AGGREGATE.completionSections;
    const catalog = [
      { name: 'counted', section },
      { name: 'memorial', section: 'memorial' },
      { name: 'orphan', section: null }
    ];

    expect([...obtainableNames(catalog)]).toEqual(['counted']);
  });
});
