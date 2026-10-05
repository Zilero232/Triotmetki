import type { Database } from '../../../../../core';

export type ModeMetaRowsInput = {
  db: Database;
  battleTypes: readonly string[];
  since: Date;
};

export type BuildRanksInput = {
  db: Database;
  battleTypes: readonly string[];
  since: Date;
};
