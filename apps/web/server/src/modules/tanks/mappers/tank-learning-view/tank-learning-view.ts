import type { LearningBucket, TankLearning } from '@otmetki/schemas';

import { LEARNING_CURVE } from '@otmetki/schemas';
import { firstBy } from 'remeda';

import type { ToTankLearningInput } from './tank-learning-view.types';

import { clampPercent, winRatePercent } from '../../../../common/lib';
import { learningDifficulty, learningGain } from '../../lib/learning-curve';

export const toTankLearning = ({ tankId, rows }: ToTankLearningInput): TankLearning => {
  const starts = LEARNING_CURVE.bucketStarts;

  const buckets = starts.map((from, index): LearningBucket => {
    const row = rows.find((item) => item.bucket === index);
    const battles = row?.battles ?? 0;

    return {
      index,
      from,
      to: starts[index + 1] ?? null,
      battles,
      players: row?.players ?? 0,
      winRate: row ? clampPercent(winRatePercent({ wins: row.wins, battles })) : null,
      avgDamage: row && battles > 0 ? Number(row.damage) / battles : null
    };
  });

  const gain = learningGain(buckets);
  const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

  return {
    tankId,
    windowDays: latest?.windowDays ?? LEARNING_CURVE.windowDays,
    buckets,
    gain,
    difficulty: learningDifficulty(gain),
    computedAt: latest ? latest.computedAt.toISOString() : null
  };
};
