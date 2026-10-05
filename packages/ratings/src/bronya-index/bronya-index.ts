import { clamp, fromKeys, sumBy, zip } from 'remeda';

import type { CurvePoint } from '../interpolation';
import type {
  BronyaComponent,
  BronyaIndexInput,
  BronyaIndexResult,
  PercentileInput,
  TankBronyaScore,
  TankBronyaScoreInput
} from './bronya-index.types';

import { interpolate } from '../interpolation';
import { computeAverages } from '../stats';
import { BRONYA_COMPONENTS, BRONYA_INDEX } from './bronya-index.constants';

export const percentileOf = ({ value, quantiles, levels = BRONYA_INDEX.quantileLevels }: PercentileInput): number => {
  if (quantiles.length !== levels.length || quantiles.length < 2) {
    throw new RangeError(`Expected ${levels.length} quantiles, got ${quantiles.length}`);
  }

  const points: CurvePoint[] = [[0, 0], ...zip(quantiles, levels)];

  return clamp(interpolate({ points, x: value, extrapolate: true }), { min: 0, max: 1 });
};

const tankBronyaScore = ({ totals, reference, priorBattles = BRONYA_INDEX.priorBattles }: TankBronyaScoreInput): TankBronyaScore => {
  const averages = computeAverages(totals);
  const values: Record<BronyaComponent, number> = {
    damage: averages.damage,
    winRate: averages.winRate,
    frags: averages.frags,
    spotted: averages.spotted,
    defence: averages.defence
  };

  const percentiles = fromKeys(BRONYA_COMPONENTS, (component) =>
    percentileOf({ value: values[component], quantiles: reference.quantiles[component] })
  );

  const rawScore = sumBy(BRONYA_COMPONENTS, (component) => BRONYA_INDEX.weights[component] * percentiles[component]);

  const shrunkScore = (totals.battles * rawScore + priorBattles * BRONYA_INDEX.neutralScore) / (totals.battles + priorBattles);

  return { tankId: totals.tankId, battles: totals.battles, percentiles, rawScore, shrunkScore };
};

export const bronyaIndex = ({ tanks, references, priorBattles = BRONYA_INDEX.priorBattles }: BronyaIndexInput): BronyaIndexResult => {
  const scored: TankBronyaScore[] = [];
  const tanksWithoutReference: number[] = [];

  for (const totals of tanks) {
    if (totals.battles === 0) {
      continue;
    }

    const reference = references.get(totals.tankId);

    if (!reference) {
      tanksWithoutReference.push(totals.tankId);

      continue;
    }

    scored.push(tankBronyaScore({ totals, reference, priorBattles }));
  }

  const battles = sumBy(scored, (tank) => tank.battles);

  if (battles === 0) {
    return { index: null, confidence: 0, battles, tanks: scored, tanksWithoutReference };
  }

  const score = sumBy(scored, (tank) => tank.battles * tank.shrunkScore) / battles;

  return {
    index: Math.round(score * BRONYA_INDEX.scale),
    confidence: battles / (battles + priorBattles),
    battles,
    tanks: scored,
    tanksWithoutReference
  };
};
