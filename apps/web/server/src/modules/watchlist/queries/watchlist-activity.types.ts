import type { Database } from '../../../core';

export type MarksGainedInput = {
  db: Database;
  accountIds: number[];
  since: Date;
  lookback: Date;
};

export type SessionTotalsInput = {
  db: Database;
  accountIds: number[];
  since: Date;
};
