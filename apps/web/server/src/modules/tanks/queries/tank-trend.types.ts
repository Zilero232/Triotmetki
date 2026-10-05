import type { StatsMode } from '../../../../generated/kysely/enums';
import type { Database } from '../../../core';

export type TankTrendRowsInput = {
  db: Database;
  tankId: number;
  mode: StatsMode;
  from: Date;
  recent: Date;
  recentDay: string;
};
