import type { Database } from '../../../core';

export type MyModeBattlesInput = {
  db: Database;
  accountId: number;
  battleTypes: string[];
  since: Date;
};
