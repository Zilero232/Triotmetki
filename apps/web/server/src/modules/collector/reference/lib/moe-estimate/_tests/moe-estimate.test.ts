import { MOE_CURVE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { MoeEstimateRow } from '../../../queries/moe-estimate.types';

import { MOE_ESTIMATE } from '../../../config/moe-estimate.constants';
import { moeEstimates } from '../moe-estimate';

const { percents } = MOE_ESTIMATE;

const point = (percent: number, damage: number, players: number = MOE_CURVE.minPlayers, tankId = 1): MoeEstimateRow => ({
  tankId,
  percent,
  damage,
  players
});

const tank = (tankId: number): MoeEstimateRow[] => [
  point(percents.p65, 2_000, MOE_CURVE.minPlayers, tankId),
  point(percents.p85, 2_600, MOE_CURVE.minPlayers + 3, tankId),
  point(percents.p95, 3_100, MOE_CURVE.minPlayers + 1, tankId)
];

describe('moeEstimates', () => {
  it('builds the three mark thresholds from the median damage at each percent', () => {
    expect(moeEstimates(tank(1))).toEqual([{ tankId: 1, p65: 2_000, p85: 2_600, p95: 3_100, p100: null, sampleSize: MOE_CURVE.minPlayers }]);
  });

  it('adds the 100 % level only when enough players sit above the third mark', () => {
    const [withTop] = moeEstimates([...tank(1), point(percents.p100, 3_950.6)]);
    const [withoutTop] = moeEstimates([...tank(1), point(percents.p100, 3_950, MOE_CURVE.minPlayers - 1)]);

    expect(withTop?.p100).toBe(3_951);
    expect(withoutTop?.p100).toBeNull();
  });

  it('drops the 100 % level when its damage is not above the 95 % one', () => {
    const [estimate] = moeEstimates([...tank(1), point(percents.p100, 3_100)]);

    expect(estimate?.p100).toBeNull();
  });

  it('skips a tank while any of the three levels lacks players', () => {
    const rows = [...tank(1).slice(0, 2), point(percents.p95, 3_100, MOE_CURVE.minPlayers - 1)];

    expect(moeEstimates(rows)).toEqual([]);
  });

  it('skips a tank whose medians do not rise from 65 to 95 %', () => {
    const rows = [point(percents.p65, 2_600), point(percents.p85, 2_600), point(percents.p95, 3_100)];

    expect(moeEstimates(rows)).toEqual([]);
  });

  it('estimates every reported tank on its own', () => {
    const estimates = moeEstimates([...tank(2), ...tank(1)]);

    expect(estimates.map((estimate) => estimate.tankId).toSorted()).toEqual([1, 2]);
  });
});
