import type { SweatIndex, SweatLevel } from '@otmetki/schemas';

import type { BuildSweatIndexInput, QuantileInput, SweatCutoffs, SweatLevelInput, SweatRatioInput } from './sweat-index.types';

import { roundTo } from '../../../../common/lib';
import { SWEAT_INDEX } from '../../config/sweat-index.constants';
import { SWEAT_RATIO } from './sweat-index.constants';

export const sweatRatio = ({ threshold, baseline }: SweatRatioInput): number | null =>
  threshold && baseline && threshold > 0 && baseline > 0 ? roundTo({ value: threshold / baseline, digits: SWEAT_RATIO.digits }) : null;

const quantile = ({ sorted, level }: QuantileInput): number => sorted[Math.floor(level * (sorted.length - 1))] ?? 0;

export const sweatCutoffs = (values: readonly number[]): SweatCutoffs | null => {
  if (values.length < SWEAT_INDEX.minTanks) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);

  return {
    moderate: quantile({ sorted, level: SWEAT_INDEX.quantiles.moderate }),
    hard: quantile({ sorted, level: SWEAT_INDEX.quantiles.hard }),
    extreme: quantile({ sorted, level: SWEAT_INDEX.quantiles.extreme })
  };
};

export const sweatLevel = ({ value, cutoffs }: SweatLevelInput): SweatLevel | null => {
  if (value === null || !cutoffs) {
    return null;
  }

  if (value >= cutoffs.extreme) {
    return 'extreme';
  }

  if (value >= cutoffs.hard) {
    return 'hard';
  }

  return value >= cutoffs.moderate ? 'moderate' : 'easy';
};

export const buildSweatIndex = ({ tankIds, moe, mastery, baselines }: BuildSweatIndexInput): Map<number, SweatIndex> => {
  const ratios = tankIds.map((tankId) => {
    const baseline = baselines.get(tankId);

    return {
      tankId,
      moe: sweatRatio({ threshold: moe.get(tankId), baseline: baseline?.damage }),
      mastery: sweatRatio({ threshold: mastery.get(tankId), baseline: baseline?.xp })
    };
  });

  const moeCutoffs = sweatCutoffs(ratios.flatMap((ratio) => (ratio.moe === null ? [] : [ratio.moe])));
  const masteryCutoffs = sweatCutoffs(ratios.flatMap((ratio) => (ratio.mastery === null ? [] : [ratio.mastery])));

  return new Map(
    ratios.map((ratio) => [
      ratio.tankId,
      {
        moe: ratio.moe,
        moeLevel: sweatLevel({ value: ratio.moe, cutoffs: moeCutoffs }),
        mastery: ratio.mastery,
        masteryLevel: sweatLevel({ value: ratio.mastery, cutoffs: masteryCutoffs })
      }
    ])
  );
};

export const EMPTY_SWEAT: SweatIndex = { moe: null, moeLevel: null, mastery: null, masteryLevel: null };
