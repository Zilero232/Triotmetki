import type { ThresholdKind, ThresholdSource } from '../../../../generated';
import type { Database } from '../../../core';
import type { THRESHOLDS_QUERIES } from './thresholds.queries';

export type LatestThresholdsInput = {
  db: Database;
  kind: ThresholdKind;
  upTo: Date;
  source?: ThresholdSource;
};

export type ThresholdsQueries = typeof THRESHOLDS_QUERIES;
