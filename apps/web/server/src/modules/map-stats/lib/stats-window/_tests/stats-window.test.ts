import { differenceInCalendarDays } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { MAP_STATS } from '../../../config/map-stats.constants';
import { statsWindow } from '../stats-window';

const NOW = new Date('2026-09-26T12:00:00Z');

describe('statsWindow', () => {
  it('ends at now and starts the configured number of days earlier', () => {
    const { from, to } = statsWindow({ now: NOW, days: MAP_STATS.windowDays });

    expect(to).toEqual(NOW);
    expect(differenceInCalendarDays(to, from)).toBe(MAP_STATS.windowDays);
  });

  it('collapses to a single instant for a zero-day window', () => {
    const { from, to } = statsWindow({ now: NOW, days: 0 });

    expect(from.getTime()).toBe(to.getTime());
  });
});
