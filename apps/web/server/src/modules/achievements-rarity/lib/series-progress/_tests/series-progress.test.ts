import { describe, expect, it } from 'vitest';

import { ACHIEVEMENT_SERIES } from '../../../config/aggregate.constants';
import { seriesProgress } from '../series-progress';

const [sniper] = ACHIEVEMENT_SERIES;

describe('seriesProgress', () => {
  it('returns one row per tracked series', () => {
    expect(seriesProgress({})).toHaveLength(ACHIEVEMENT_SERIES.length);
  });

  it('reads either the achievement name or the series alias', () => {
    const byAlias = seriesProgress({ [sniper.keys[1]]: 4 })[0];
    const byName = seriesProgress({ [sniper.name]: 4 })[0];

    expect(byAlias?.best).toBe(4);
    expect(byName?.best).toBe(4);
  });

  it('caps progress at the threshold and marks it achieved', () => {
    const below = seriesProgress({ [sniper.name]: sniper.threshold - 1 })[0];
    const above = seriesProgress({ [sniper.name]: sniper.threshold * 3 })[0];

    expect(below?.achieved).toBe(false);
    expect(below?.progress).toBeLessThan(above?.progress ?? 0);
    expect(above?.achieved).toBe(true);
    expect(above?.progress).toBe(100);
  });
});
