import type { Database } from '../../../core';

export type OwnBattlesInput = {
  db: Database;
  accountId: number;
  battleType: string;
  from: Date;
};

export type TankReferenceInput = {
  db: Database;
  accountId: number;
  tankId: number;
  battleType: string;
  excludedBattleId: string;
};
