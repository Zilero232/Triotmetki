import { describe, expect, it } from 'vitest';

import { BEST_BATTLE_PERIODS } from '../../../config/facets.constants';
import { periodSince } from '../battle-period';

const now = new Date('2026-09-26T12:00:00.000Z');

describe('periodSince', () => {
  it('starts every window before now', () => {
    for (const period of BEST_BATTLE_PERIODS) {
      expect(periodSince({ period, now }).getTime()).toBeLessThan(now.getTime());
    }
  });

  it('widens the window from day to week to month', () => {
    const day = periodSince({ period: 'day', now }).getTime();
    const week = periodSince({ period: 'week', now }).getTime();
    const month = periodSince({ period: 'month', now }).getTime();

    expect(week).toBeLessThan(day);
    expect(month).toBeLessThan(week);
  });

  it('keeps the day window at 24 hours', () => {
    expect(now.getTime() - periodSince({ period: 'day', now }).getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
