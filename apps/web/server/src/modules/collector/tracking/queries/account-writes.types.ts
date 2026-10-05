import type { ExpressionBuilder, OnConflictDatabase, OnConflictTables } from 'kysely';

import type { Prisma } from '../../../../../generated';
import type { DB } from '../../../../../generated/kysely/database';
import type { Database } from '../../../../core';
import type { TankMarks } from '../lib/marks-gain/marks-gain.types';
import type { AccountModeRow, TankModeRow } from '../lib/mode-stats/mode-stats.types';
import type { ACCOUNT_WRITE_QUERIES } from './account-writes.queries';

export type PlayerTankUpsertRow = Pick<
  Prisma.PlayerTankCreateManyInput,
  'accountId' | 'battles' | 'lastBattleAt' | 'markOfMastery' | 'tankId' | 'wins'
>;

export type AccountCaptureInput = {
  db: Database;
  accountId: number;
  capturedAt: Date;
};

export type UpsertPlayerTanksInput = {
  db: Database;
  rows: readonly PlayerTankUpsertRow[];
};

export type UpdateLestaMarksInput = {
  db: Database;
  rows: readonly TankMarks[];
};

export type UpsertAccountModeStatsInput = {
  db: Database;
  rows: readonly AccountModeRow[];
};

export type UpsertTankModeStatsInput = {
  db: Database;
  rows: readonly TankModeRow[];
};

export type ModeStatsConflict = ExpressionBuilder<OnConflictDatabase<DB, 'account_mode_stats'>, OnConflictTables<'account_mode_stats'>>;

export type RecordDateInput = {
  eb: ModeStatsConflict;
  record: 'max_damage' | 'max_frags' | 'max_xp';
};

export type AccountWriteQueries = typeof ACCOUNT_WRITE_QUERIES;
