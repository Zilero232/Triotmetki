import type { Database } from '../../../core';
import type { AccountDeltasInput } from './player-history.types';

type WeekStart = {
  weekStartsOn: 'monday' | 'sunday';
};

export type PlaytimeFromBattlesInput = WeekStart & {
  db: Database;
  accountId: number;
  from: Date;
  battleType?: string;
};

export type PlaytimeFromDeltasInput = AccountDeltasInput & WeekStart;
