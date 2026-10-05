import type { Database } from '../../../../core';
import type { moeEstimatePoints } from './moe-estimate.queries';

export type MoeEstimatePointsInput = {
  db: Database;
  since: Date;
  steps: readonly number[];
  band: number;
  battleType: string;
};

export type MoeEstimateRow = Awaited<ReturnType<typeof moeEstimatePoints>>[number];
