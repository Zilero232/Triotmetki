import type { Database } from '../../../core';
import type { MOD_RATINGS_QUERIES, tankRecords } from './ratings.queries';

export type TankRecordsInput = {
  db: Database;
  accountId: number;
  tankIds: readonly number[];
  battleTypes: readonly string[];
};

export type TankRecordRow = Awaited<ReturnType<typeof tankRecords>>[number];

export type ModRatingsQueries = typeof MOD_RATINGS_QUERIES;
