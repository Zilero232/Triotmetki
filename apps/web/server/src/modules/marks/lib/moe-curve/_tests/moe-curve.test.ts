import { MOD_AGGREGATES, MOE_CURVE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { curvePoints, curveSteps } from '../moe-curve';

describe('curveSteps', () => {
  it('walks from the first to the last percent in equal steps', () => {
    const steps = curveSteps();

    expect(steps[0]).toBe(MOE_CURVE.fromPercent);
    expect(steps.at(-1)).toBe(MOE_CURVE.toPercent);
    expect(steps.slice(1).every((step, index) => step - (steps[index] ?? 0) === MOE_CURVE.stepPercent)).toBe(true);
  });

  it('includes every official threshold so the two can be compared', () => {
    expect(MOE_CURVE.officialPercents.every((percent) => curveSteps().includes(percent))).toBe(true);
  });
});

describe('curvePoints', () => {
  it('drops a percent reported by fewer players than the minimum', () => {
    const points = curvePoints([
      { percent: 50, damage: 1_800.4, players: MOE_CURVE.minPlayers, battles: 40 },
      { percent: 55, damage: 1_900, players: MOE_CURVE.minPlayers - 1, battles: 40 }
    ]);

    expect(points).toEqual([{ percent: 50, damage: 1_800, players: MOE_CURVE.minPlayers, battles: 40 }]);
  });

  it('never fills a missing percent between two reported ones', () => {
    const points = curvePoints([
      { percent: 50, damage: 1_800, players: MOE_CURVE.minPlayers, battles: 40 },
      { percent: 60, damage: 2_100, players: MOE_CURVE.minPlayers, battles: 40 }
    ]);

    expect(points.map(({ percent }) => percent)).toEqual([50, 60]);
  });
});

describe('curvePoints and public aggregates', () => {
  it('drops a percent fed by fewer distinct accounts than any mod-fed public aggregate needs', () => {
    const points = curvePoints([{ percent: 50, damage: 1_800, players: MOD_AGGREGATES.minAccounts - 1, battles: 400 }]);

    expect(points).toEqual([]);
  });
});
