import type { Database } from '../../../core';
import type { moeCurveQueries } from './moe-curve.queries';

export type MoeCurveInput = {
  db: Database;
  tankId: number;
  since: Date;
  steps: number[];
  band: number;
  battleType: string;
};

export type MoeCurveQueries = typeof moeCurveQueries;
