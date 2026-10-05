import type { Database } from '../../../core';

export type AccountDeltasInput = {
  db: Database;
  accountId: number;
  from: Date;
};

export type TankDeltaBucketsInput = AccountDeltasInput & {
  granularity: 'day' | 'month' | 'week';
  to?: Date;
  tankId?: number;
};
