import type { learningCurveRows } from '../queries/learning-curve.queries';
import type { tankEconomyRows } from '../queries/tank-economy.queries';

export type EconomyRow = Awaited<ReturnType<typeof tankEconomyRows>>[number];

export type LearningRow = Awaited<ReturnType<typeof learningCurveRows>>[number];

export type ToEconomyRecordInput = {
  row: EconomyRow;
  windowDays: number;
  computedAt: Date;
};

export type ToLearningRecordInput = {
  row: LearningRow;
  windowDays: number;
  computedAt: Date;
};
