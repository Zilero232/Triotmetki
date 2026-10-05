import type { Database } from '../../../../core';
import type { RetentionRule } from '../purge.types';
import type { RETENTION_QUERIES } from './retention.queries';

export type DeleteExpiredBatchInput = {
  db: Database;
  rule: RetentionRule;
  cutoff: Date;
  limit: number;
};

export type RetentionQueries = typeof RETENTION_QUERIES;
