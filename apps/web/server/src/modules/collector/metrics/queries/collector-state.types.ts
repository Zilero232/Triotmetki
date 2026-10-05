import type { Database } from '../../../../core';

export type MergeCollectorStateInput = {
  db: Database;
  key: string;
  value: Readonly<Record<string, string>>;
};
