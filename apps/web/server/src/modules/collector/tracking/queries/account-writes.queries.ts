import type {
  AccountCaptureInput,
  ModeStatsConflict,
  RecordDateInput,
  UpdateLestaMarksInput,
  UpsertAccountModeStatsInput,
  UpsertPlayerTanksInput,
  UpsertTankModeStatsInput
} from './account-writes.types';

import { valuesTable } from '../../../../core';
import { SNAPSHOT_COLUMNS } from '../config/snapshot-columns.constants';
import { MODE_STATS_SQL } from '../lib/mode-blocks/mode-blocks.constants';

export const refreshLatestTankSnapshots = async ({ db, accountId, capturedAt }: AccountCaptureInput): Promise<void> => {
  await db
    .insertInto('tank_snapshot_latest')
    .columns(SNAPSHOT_COLUMNS.tankSnapshot)
    .expression(
      db.selectFrom('tank_snapshot').select(SNAPSHOT_COLUMNS.tankSnapshot).where('account_id', '=', accountId).where('captured_at', '=', capturedAt)
    )
    .onConflict((conflict) =>
      conflict
        .columns(['account_id', 'tank_id', 'mode'])
        .doUpdateSet((eb) => ({
          captured_at: eb.ref('excluded.captured_at'),
          battles: eb.ref('excluded.battles'),
          wins: eb.ref('excluded.wins'),
          losses: eb.ref('excluded.losses'),
          draws: eb.ref('excluded.draws'),
          damage_dealt: eb.ref('excluded.damage_dealt'),
          damage_received: eb.ref('excluded.damage_received'),
          frags: eb.ref('excluded.frags'),
          spotted: eb.ref('excluded.spotted'),
          xp: eb.ref('excluded.xp'),
          survived_battles: eb.ref('excluded.survived_battles'),
          hits: eb.ref('excluded.hits'),
          shots: eb.ref('excluded.shots'),
          capture_points: eb.ref('excluded.capture_points'),
          dropped_capture_points: eb.ref('excluded.dropped_capture_points'),
          avg_damage_blocked: eb.ref('excluded.avg_damage_blocked'),
          mark_of_mastery: eb.ref('excluded.mark_of_mastery'),
          marks_on_gun: eb.ref('excluded.marks_on_gun'),
          max_frags: eb.ref('excluded.max_frags'),
          max_xp: eb.ref('excluded.max_xp')
        }))
        .whereRef('tank_snapshot_latest.captured_at', '<', 'excluded.captured_at')
    )
    .execute();
};

export const upsertPlayerTanks = async ({ db, rows }: UpsertPlayerTanksInput): Promise<void> => {
  await db
    .insertInto('player_tank')
    .values((eb) =>
      rows.map((row) => {
        const accountId = Number(row.accountId);
        const knownGarage = eb.exists(
          eb
            .selectFrom('player_tank as garage')
            .select(eb.lit(1).as('found'))
            .where('garage.account_id', '=', accountId)
            .where('garage.in_garage', 'is not', null)
        );

        return {
          account_id: accountId,
          tank_id: row.tankId,
          battles: row.battles ?? 0,
          wins: row.wins ?? 0,
          mark_of_mastery: row.markOfMastery ?? 0,
          last_battle_at: row.lastBattleAt ?? null,
          in_garage: row.lastBattleAt ? eb.case().when(knownGarage).then(eb.lit(true)).end() : null,
          updated_at: eb.fn<Date>('now')
        };
      })
    )
    .onConflict((conflict) =>
      conflict
        .columns(['account_id', 'tank_id'])
        .doUpdateSet((eb) => ({
          battles: eb.ref('excluded.battles'),
          wins: eb.ref('excluded.wins'),
          mark_of_mastery: eb.ref('excluded.mark_of_mastery'),
          last_battle_at: eb.fn.coalesce('excluded.last_battle_at', 'player_tank.last_battle_at'),
          in_garage: eb.case().when('excluded.in_garage', 'is', true).then(eb.lit(true)).else(eb.ref('player_tank.in_garage')).end(),
          updated_at: eb.fn<Date>('now')
        }))
        .whereRef('player_tank.battles', '<=', 'excluded.battles')
    )
    .execute();
};

export const updateLestaMarks = async ({ db, rows }: UpdateLestaMarksInput): Promise<void> => {
  const lesta = valuesTable({
    rows: rows.map((row) => ({ account_id: Number(row.accountId), tank_id: row.tankId, marks: row.marks })),
    alias: 'lesta',
    types: { account_id: 'bigint', tank_id: 'integer', marks: 'smallint' }
  });

  await db
    .updateTable('player_tank')
    .from(lesta)
    .set((eb) => ({ marks_on_gun: eb.ref('lesta.marks'), marks_source: 'lesta', updated_at: eb.fn<Date>('now') }))
    .whereRef('player_tank.account_id', '=', 'lesta.account_id')
    .whereRef('player_tank.tank_id', '=', 'lesta.tank_id')
    .execute();
};

const recordDate = ({ eb, record }: RecordDateInput) =>
  eb
    .case()
    .when(eb.ref(`excluded.${record}`), '>', eb.fn.coalesce(`account_mode_stats.${record}`, eb.lit(-1)))
    .then(eb.ref(`excluded.${record}_at`))
    .else(eb.ref(`account_mode_stats.${record}_at`))
    .end();

const modeStatsUpdate = (eb: ModeStatsConflict) => ({
  battles: eb.ref('excluded.battles'),
  wins: eb.ref('excluded.wins'),
  losses: eb.ref('excluded.losses'),
  draws: eb.ref('excluded.draws'),
  damage_dealt: eb.ref('excluded.damage_dealt'),
  damage_received: eb.ref('excluded.damage_received'),
  frags: eb.ref('excluded.frags'),
  spotted: eb.ref('excluded.spotted'),
  xp: eb.ref('excluded.xp'),
  survived_battles: eb.ref('excluded.survived_battles'),
  hits: eb.ref('excluded.hits'),
  shots: eb.ref('excluded.shots'),
  capture_points: eb.ref('excluded.capture_points'),
  dropped_capture_points: eb.ref('excluded.dropped_capture_points'),
  avg_damage_blocked: eb.ref('excluded.avg_damage_blocked'),
  avg_damage_assisted: eb.ref('excluded.avg_damage_assisted'),
  max_damage_at: recordDate({ eb, record: 'max_damage' }),
  max_xp_at: recordDate({ eb, record: 'max_xp' }),
  max_frags_at: recordDate({ eb, record: 'max_frags' }),
  max_damage: eb.ref('excluded.max_damage'),
  max_xp: eb.ref('excluded.max_xp'),
  max_frags: eb.ref('excluded.max_frags'),
  updated_at: eb.fn<Date>('now')
});

export const upsertAccountModeStats = async ({ db, rows }: UpsertAccountModeStatsInput): Promise<void> => {
  await db
    .insertInto('account_mode_stats')
    .values((eb) =>
      rows.map((row) => {
        const now = eb.fn<Date>('now');

        return {
          account_id: Number(row.accountId),
          mode: MODE_STATS_SQL[row.mode],
          battles: row.battles,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          damage_dealt: Number(row.damageDealt),
          damage_received: Number(row.damageReceived),
          frags: row.frags,
          spotted: row.spotted,
          xp: Number(row.xp),
          survived_battles: row.survived,
          hits: row.hits,
          shots: row.shots,
          capture_points: row.capturePoints,
          dropped_capture_points: row.droppedCapturePoints,
          avg_damage_blocked: row.avgDamageBlocked,
          avg_damage_assisted: row.avgDamageAssisted ?? null,
          max_damage: row.maxDamage ?? null,
          max_xp: row.maxXp ?? null,
          max_frags: row.maxFrags ?? null,
          updated_at: now,
          max_damage_at: row.maxDamage == null ? null : now,
          max_xp_at: row.maxXp == null ? null : now,
          max_frags_at: row.maxFrags == null ? null : now
        };
      })
    )
    .onConflict((conflict) =>
      conflict.columns(['account_id', 'mode']).doUpdateSet(modeStatsUpdate).whereRef('account_mode_stats.battles', '<=', 'excluded.battles')
    )
    .execute();
};

export const upsertRandomModeStats = async ({ db, accountId, capturedAt }: AccountCaptureInput): Promise<void> => {
  await db
    .insertInto('account_mode_stats')
    .columns([...SNAPSHOT_COLUMNS.accountModeStats, 'updated_at', 'max_damage_at', 'max_xp_at', 'max_frags_at'])
    .expression(
      db
        .selectFrom('account_snapshot')
        .select((eb) => [
          ...SNAPSHOT_COLUMNS.accountModeStats,
          eb.fn<Date>('now').as('updated_at'),
          eb.case().when('max_damage', 'is not', null).then(eb.ref('captured_at')).end().as('max_damage_at'),
          eb.case().when('max_xp', 'is not', null).then(eb.ref('captured_at')).end().as('max_xp_at'),
          eb.case().when('max_frags', 'is not', null).then(eb.ref('captured_at')).end().as('max_frags_at')
        ])
        .where('account_id', '=', accountId)
        .where('mode', '=', 'random')
        .where('captured_at', '=', capturedAt)
    )
    .onConflict((conflict) =>
      conflict.columns(['account_id', 'mode']).doUpdateSet(modeStatsUpdate).whereRef('account_mode_stats.battles', '<=', 'excluded.battles')
    )
    .execute();
};

export const upsertTankModeStats = async ({ db, rows }: UpsertTankModeStatsInput): Promise<void> => {
  await db
    .insertInto('tank_mode_stats')
    .values((eb) =>
      rows.map((row) => ({
        account_id: Number(row.accountId),
        tank_id: row.tankId,
        mode: MODE_STATS_SQL[row.mode],
        battles: row.battles,
        wins: row.wins,
        damage_dealt: row.damageDealt,
        frags: row.frags,
        spotted: row.spotted,
        xp: row.xp,
        survived_battles: row.survived,
        updated_at: eb.fn<Date>('now')
      }))
    )
    .onConflict((conflict) =>
      conflict
        .columns(['account_id', 'tank_id', 'mode'])
        .doUpdateSet((eb) => ({
          battles: eb.ref('excluded.battles'),
          wins: eb.ref('excluded.wins'),
          damage_dealt: eb.ref('excluded.damage_dealt'),
          frags: eb.ref('excluded.frags'),
          spotted: eb.ref('excluded.spotted'),
          xp: eb.ref('excluded.xp'),
          survived_battles: eb.ref('excluded.survived_battles'),
          updated_at: eb.fn<Date>('now')
        }))
        .whereRef('tank_mode_stats.battles', '<=', 'excluded.battles')
    )
    .execute();
};

export const ACCOUNT_WRITE_QUERIES = {
  refreshLatestTankSnapshots,
  upsertRandomModeStats,
  upsertPlayerTanks,
  updateLestaMarks,
  upsertAccountModeStats,
  upsertTankModeStats
} as const;
