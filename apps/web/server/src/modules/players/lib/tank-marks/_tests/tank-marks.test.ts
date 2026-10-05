import { describe, expect, it } from 'vitest';

import { PLAYER_MARKS } from '../../../config/player-stats.constants';
import { clampMastery, marksSummary } from '../tank-marks';

describe('clampMastery', () => {
  it('keeps a mastery level inside the badge range', () => {
    expect(clampMastery(-1)).toBe(0);
    expect(clampMastery(PLAYER_MARKS.maxMastery + 1)).toBe(PLAYER_MARKS.maxMastery);
    expect(clampMastery(1)).toBe(1);
  });
});

describe('marksSummary', () => {
  it('counts each mark level, the top mastery badge and every eligible tank', () => {
    const summary = marksSummary([
      { marksOnGun: 3, markOfMastery: PLAYER_MARKS.maxMastery },
      { marksOnGun: 1, markOfMastery: 0 },
      { marksOnGun: 1, markOfMastery: PLAYER_MARKS.maxMastery - 1 },
      { marksOnGun: null, markOfMastery: 0 }
    ]);

    expect(summary).toEqual({ moe3: 1, moe2: 0, moe1: 2, mastery: 1, eligible: 4 });
  });
});
