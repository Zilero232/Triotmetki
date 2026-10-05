import { addMinutes } from 'date-fns';
import { range } from 'remeda';
import { describe, expect, it } from 'vitest';

import type { TiltBattle } from '../tilt.types';

import { TILT } from '../../../config/tilt.constants';
import { tilt } from '../tilt';

const START = new Date('2026-09-01T18:00:00Z');

const series = (results: TiltBattle['result'][], gapMinutes = 5): TiltBattle[] =>
  results.map((result, index) => ({ result, startedAt: addMinutes(START, index * gapMinutes) }));

describe('tilt', () => {
  it('returns an empty profile without battles', () => {
    const result = tilt([]);

    expect(result.battles).toBe(0);
    expect(result.stopAfter).toBeNull();
    expect(result.steps.every((step) => step.winRate === null)).toBe(true);
  });

  it('counts the longest and the trailing loss streak', () => {
    const result = tilt(series(['loss', 'loss', 'loss', 'win', 'loss', 'loss']));

    expect(result.longestLossStreak).toBe(3);
    expect(result.currentLossStreak).toBe(2);
  });

  it('resets the streak after a long break', () => {
    const result = tilt(series(['loss', 'loss', 'win'], TILT.sessionGapMinutes + 1));

    expect(result.steps[0]?.battles).toBe(3);
  });

  it('advises a stop once the win rate after losses drops below the average', () => {
    const block: TiltBattle['result'][] = ['win', 'win', 'win', 'loss', 'loss'];
    const results = range(0, TILT.minStepBattles * 2).flatMap(() => block);

    const result = tilt(series(results));
    const afterTwo = result.steps.find((step) => step.afterLosses === 2);

    expect(afterTwo?.winRate).toBeGreaterThan(0);
    expect(result.stopAfter).not.toBeNull();
    expect(result.stopAfter).toBeGreaterThan(0);
  });
});
