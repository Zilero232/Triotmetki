import { MOE_CURVE } from '@otmetki/schemas';
import { groupBy } from 'remeda';

import type { MoeEstimateRow } from '../../queries/moe-estimate.types';
import type { MoeEstimate, MoeEstimateLevel } from './moe-estimate.types';

import { MOE_ESTIMATE } from '../../config/moe-estimate.constants';

const levelOf = ({ points, percent }: { points: readonly MoeEstimateRow[]; percent: number }): MoeEstimateLevel | null => {
  const point = points.find((candidate) => candidate.percent === percent && candidate.players >= MOE_CURVE.minPlayers);

  if (!point || !Number.isFinite(point.damage) || point.damage <= 0) {
    return null;
  }

  return { damage: Math.round(point.damage), players: point.players };
};

const estimateOf = (points: readonly MoeEstimateRow[]): MoeEstimate | null => {
  const { percents } = MOE_ESTIMATE;
  const p65 = levelOf({ points, percent: percents.p65 });
  const p85 = levelOf({ points, percent: percents.p85 });
  const p95 = levelOf({ points, percent: percents.p95 });
  const p100 = levelOf({ points, percent: percents.p100 });
  const tankId = points[0]?.tankId;

  if (tankId === undefined || !p65 || !p85 || !p95) {
    return null;
  }

  if (!(p65.damage < p85.damage && p85.damage < p95.damage)) {
    return null;
  }

  const top = p100 && p100.damage > p95.damage ? p100 : null;

  return {
    tankId,
    p65: p65.damage,
    p85: p85.damage,
    p95: p95.damage,
    p100: top ? top.damage : null,
    sampleSize: Math.min(p65.players, p85.players, p95.players, ...(top ? [top.players] : []))
  };
};

export const moeEstimates = (rows: readonly MoeEstimateRow[]): MoeEstimate[] =>
  Object.values(groupBy(rows, (row) => row.tankId)).flatMap((points) => {
    const estimate = estimateOf(points);

    return estimate ? [estimate] : [];
  });
