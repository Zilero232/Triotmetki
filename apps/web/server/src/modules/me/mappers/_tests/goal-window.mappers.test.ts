import { describe, expect, it } from 'vitest';

import { toApiTankTotals, toModTankTotals } from '../goal-window.mappers';

const sums = { damageDealt: 6000, frags: 3, spotted: 2, capturePoints: null, droppedCapturePoints: 10 };

describe('toModTankTotals', () => {
  it('counts a group of won battles as wins', () => {
    expect(toModTankTotals({ tankId: 1, result: 'win', _count: { _all: 2 }, _sum: sums })).toEqual({
      tankId: 1,
      battles: 2,
      wins: 2,
      damageDealt: 6000,
      frags: 3,
      spotted: 2,
      capturePoints: 0,
      droppedCapturePoints: 10
    });
  });

  it('counts no wins for a group of lost battles', () => {
    expect(toModTankTotals({ tankId: 1, result: 'loss', _count: { _all: 2 }, _sum: sums }).wins).toBe(0);
  });
});

describe('toApiTankTotals', () => {
  it('reads battles and wins from the summed deltas', () => {
    expect(toApiTankTotals({ tankId: 5, _sum: { ...sums, battles: 4, wins: null } })).toMatchObject({ tankId: 5, battles: 4, wins: 0 });
  });
});
