import { describe, expect, it } from 'vitest';

import { MASTERY_LEVELS, MASTERY_PERCENTILES, masteryLevel, masteryThresholds } from '..';

describe('mastery', () => {
  it('maps the API mark_of_mastery integer to a level', () => {
    MASTERY_LEVELS.forEach((level, index) => {
      expect(masteryLevel(index)).toBe(level);
    });

    expect(masteryLevel(99)).toBe('none');
  });

  it('reads badge thresholds from a tanks/mastery percentile distribution', () => {
    const distribution = {
      [MASTERY_PERCENTILES.third]: 800,
      [MASTERY_PERCENTILES.second]: 1100,
      [MASTERY_PERCENTILES.first]: 1500,
      [MASTERY_PERCENTILES.ace]: 1900
    };

    const thresholds = masteryThresholds(distribution);

    expect(thresholds).toEqual({ third: 800, second: 1100, first: 1500, ace: 1900 });
    expect(masteryThresholds({ 50: 1 })).toBeNull();
  });
});
