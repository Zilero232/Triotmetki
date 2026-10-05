import type { Database } from '../../../core';
import type { WRAPPED_QUERIES } from './wrapped.queries';

export type WrappedRangeInput = {
  db: Database;
  accountId: number;
  start: Date;
  end: Date;
};

export type WrappedTopTanksInput = WrappedRangeInput & {
  limit: number;
};

export type WrappedQueries = typeof WRAPPED_QUERIES;
