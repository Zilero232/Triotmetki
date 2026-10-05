import { describe, expect, it } from 'vitest';

import { gameLabel } from '../game-label';

describe('gameLabel', () => {
  it('shows a wildcard pattern as its minor version', () => {
    expect(gameLabel('1.45.*')).toBe('1.45');
  });

  it('keeps an exact client version', () => {
    expect(gameLabel('1.46.0.0')).toBe('1.46.0.0');
  });
});
