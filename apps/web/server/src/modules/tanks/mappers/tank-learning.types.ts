import type { TankLearningCurve } from '../../../../generated';

export type LearningCurveRow = Omit<TankLearningCurve, 'tankId'>;

export type ToTankLearningInput = {
  tankId: number;
  rows: readonly LearningCurveRow[];
};
