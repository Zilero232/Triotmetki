import { describe, expect, it } from 'vitest';

import { PULSE } from '../../../config/pulse.constants';
import { activityGrid, bestHours, decodeSample, encodeSample } from '../pulse-grid';

describe('activityGrid', () => {
  it('places Monday-first weekdays and hours and ignores rows outside the grid', () => {
    const grid = activityGrid([
      { weekday: 0, hour: 0, players: 5 },
      { weekday: 6, hour: 23, players: 2 },
      { weekday: 7, hour: 1, players: 100 },
      { weekday: 0, hour: 24, players: 100 }
    ]);

    expect(grid).toHaveLength(PULSE.days);
    expect(grid[0]?.[0]).toBe(5);
    expect(grid[6]?.[23]).toBe(2);
    expect(grid.flat().reduce((sum, value) => sum + value, 0)).toBe(7);
  });
});

describe('bestHours', () => {
  it('sums every weekday and returns shares that never exceed one', () => {
    const grid = activityGrid([
      { weekday: 0, hour: 20, players: 10 },
      { weekday: 1, hour: 20, players: 10 },
      { weekday: 2, hour: 9, players: 5 }
    ]);

    const best = bestHours({ grid, count: 2 });

    expect(best.map((entry) => entry.hour)).toEqual([20, 9]);
    expect(best.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1);
  });

  it('returns nothing for an empty server', () => {
    expect(bestHours({ grid: activityGrid([]), count: 3 })).toEqual([]);
  });
});

describe('encodeSample', () => {
  it('round-trips through the Redis member format', () => {
    const sample = { at: new Date('2026-09-25T10:15:00Z'), players: 1234 };

    expect(decodeSample(encodeSample(sample))).toEqual(sample);
    expect(decodeSample('garbage')).toBeNull();
  });
});
