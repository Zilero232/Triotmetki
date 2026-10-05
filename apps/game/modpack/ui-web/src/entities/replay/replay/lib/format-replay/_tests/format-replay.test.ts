import { describe, expect, it } from 'vitest';

import { REPLAY_FORMAT } from '../../../config';
import { formatCount, formatDuration, formatSize, romanTier } from '../format-replay';

const GAME_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe(formatCount, () => {
  it('groups thousands', () => {
    expect(formatCount(1234567)).toBe('1 234 567');
  });

  it('writes zero as a number', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('shows a dash for an unknown value', () => {
    expect(formatCount(null)).toBe(REPLAY_FORMAT.dash);
  });
});

describe(formatDuration, () => {
  it.each([
    { seconds: 402, expected: '6:42' },
    { seconds: 59, expected: '0:59' }
  ])('writes $seconds seconds as $expected', ({ seconds, expected }) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('shows a dash for an unknown duration', () => {
    expect(formatDuration(null)).toBe(REPLAY_FORMAT.dash);
  });
});

describe(formatSize, () => {
  it('writes megabytes with one decimal', () => {
    expect(formatSize(2.25 * 1024 * 1024)).toBe('2.3');
  });
});

describe(romanTier, () => {
  it('writes every tier the game has', () => {
    const tiers = GAME_TIERS.map((tier) => romanTier(tier));

    expect(tiers).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']);
  });

  it('writes nothing past the last tier', () => {
    expect(romanTier(12)).toBeNull();
  });

  it('writes nothing for an unknown tier', () => {
    expect(romanTier(null)).toBeNull();
  });
});
