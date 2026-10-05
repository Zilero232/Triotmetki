import { LEARNING_CURVE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { LearningCurveRow } from '../tank-learning.types';

import { TANK_LEARNING } from '../../config/tank-traits.constants';
import { learningDifficulty } from '../../lib/learning-curve/learning-curve';
import { toTankLearning } from '../tank-learning.mappers';

const computedAt = new Date('2026-09-26T07:45:00Z');
const enough: number = TANK_LEARNING.minBucketBattles;

const row = (bucket: number, winRate: number, battles = enough): LearningCurveRow => ({
  bucket,
  battles,
  players: 10,
  wins: Math.round((battles * winRate) / 100),
  damage: BigInt(battles * 1_500),
  windowDays: LEARNING_CURVE.windowDays,
  computedAt
});

describe('toTankLearning', () => {
  it('returns one bucket per configured start, empty ones included', () => {
    const learning = toTankLearning({ tankId: 1, rows: [row(1, 50)] });

    expect(learning.buckets.map((bucket) => bucket.from)).toEqual([...LEARNING_CURVE.bucketStarts]);
    expect(learning.buckets[0]?.winRate).toBeNull();
    expect(learning.buckets.at(-1)?.to).toBeNull();
  });

  it('measures the gain between the first and the last bucket with enough battles', () => {
    const learning = toTankLearning({ tankId: 1, rows: [row(0, 46), row(1, 48), row(3, 53), row(2, 70, enough - 1)] });

    expect(learning.gain).toBeCloseTo(53 - 46, 0);
    expect(learning.difficulty).toBe(learningDifficulty(learning.gain));
  });

  it('gives no gain when only one bucket has enough battles', () => {
    const learning = toTankLearning({ tankId: 1, rows: [row(0, 46), row(1, 60, enough - 1)] });

    expect(learning.gain).toBeNull();
    expect(learning.difficulty).toBeNull();
  });

  it('reports no computation time for a tank with no curve yet', () => {
    expect(toTankLearning({ tankId: 1, rows: [] }).computedAt).toBeNull();
  });
});
