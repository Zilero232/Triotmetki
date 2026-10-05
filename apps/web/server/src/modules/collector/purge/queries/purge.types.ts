import type { Database } from '../../../../core';
import type { PURGE_QUERIES } from './purge.queries';

export type AccountInput = {
  db: Database;
  accountId: number;
};

export type ScrubReplayPlayerInput = AccountInput & {
  placeholder: string;
};

export type ContainsAccountInput = {
  column: 'player_account_ids' | 'players';
  accountId: number;
};

export type PurgeQueries = typeof PURGE_QUERIES;
