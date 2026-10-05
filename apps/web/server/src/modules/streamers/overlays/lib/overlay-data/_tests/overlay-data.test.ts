import { describe, expect, it } from 'vitest';

import { winStreak } from '../overlay-data';

describe('winStreak', () => {
  it('counts consecutive wins from the newest battle', () => {
    expect(winStreak({ results: ['win', 'win', 'loss', 'win'] })).toBe(2);
  });

  it('is zero after a loss or a draw', () => {
    expect(winStreak({ results: ['loss', 'win'] })).toBe(0);
    expect(winStreak({ results: ['draw'] })).toBe(0);
  });

  it('counts a session of only wins in full and an empty one as zero', () => {
    expect(winStreak({ results: ['win', 'win', 'win'] })).toBe(3);
    expect(winStreak({ results: [] })).toBe(0);
  });
});
