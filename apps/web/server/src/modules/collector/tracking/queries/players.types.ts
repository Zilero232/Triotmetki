import type { Database } from '../../../../core';
import type { PlayerIdentity } from '../lib/player-identity/player-identity.types';
import type { PLAYER_QUERIES } from './players.queries';

export type PlayerIdentityRow = PlayerIdentity & {
  seenAt: Date;
};

export type SyncedRow = {
  accountId: number;
  lastBattleAt: Date | null;
  lastPolledAt: Date;
  nextPollAt: Date;
};

export type UpsertPlayersInput = {
  db: Database;
  rows: readonly PlayerIdentityRow[];
};

export type MarkSyncedInput = {
  db: Database;
  rows: readonly SyncedRow[];
};

export type ClaimDueActivePlayersInput = {
  db: Database;
  now: Date;
  nextPollAt: Date;
  limit: number;
};

export type PlayerQueries = typeof PLAYER_QUERIES;
