import type {
  AccountModeRow,
  LatestRandomModeStatsSqlInput,
  LatestTanksSqlInput,
  MarksRow,
  PlayerIdentityRow,
  PlayerTankUpsertRow,
  SyncedRow,
  TankModeRow
} from './account-writes.types';

import { Prisma } from '../../../../../../generated';
import { MODE_STATS_SQL } from '../../../../../common/lib';
import { MODE_RECORD_COLUMNS, TANK_SNAPSHOT_COLUMNS } from './account-writes.constants';

const toJson = (rows: readonly object[]): string =>
  JSON.stringify(rows, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));

const columns = Prisma.raw(TANK_SNAPSHOT_COLUMNS.join(', '));

const updates = Prisma.raw(
  TANK_SNAPSHOT_COLUMNS.filter((column) => !['account_id', 'mode', 'tank_id'].includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ')
);

const recordAtColumns = Prisma.raw(MODE_RECORD_COLUMNS.map((column) => `${column}_at`).join(', '));

const recordAtValues = (at: Prisma.Sql): Prisma.Sql =>
  Prisma.join(
    MODE_RECORD_COLUMNS.map((column) => Prisma.sql`CASE WHEN ${Prisma.raw(`r.${column}`)} IS NOT NULL THEN ${at} END`),
    ', '
  );

const recordAtUpdates = Prisma.raw(
  MODE_RECORD_COLUMNS.map(
    (column) =>
      `${column}_at = CASE WHEN EXCLUDED.${column} > coalesce(account_mode_stats.${column}, -1) THEN EXCLUDED.${column}_at ELSE account_mode_stats.${column}_at END`
  ).join(', ')
);

export const upsertPlayerTanksSql = (rows: readonly PlayerTankUpsertRow[]): Prisma.Sql => Prisma.sql`
  INSERT INTO player_tank (account_id, tank_id, battles, wins, mark_of_mastery, last_battle_at, in_garage, updated_at)
  SELECT
    r.account_id, r.tank_id, coalesce(r.battles, 0), coalesce(r.wins, 0), coalesce(r.mark_of_mastery, 0), r.last_battle_at,
    CASE
      WHEN r.last_battle_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM player_tank g WHERE g.account_id = r.account_id AND g.in_garage IS NOT NULL)
      THEN true
    END,
    now()
  FROM jsonb_to_recordset(${toJson(
    rows.map((row) => ({
      account_id: row.accountId,
      tank_id: row.tankId,
      battles: row.battles,
      wins: row.wins,
      mark_of_mastery: row.markOfMastery,
      last_battle_at: row.lastBattleAt
    }))
  )}::jsonb)
    AS r(account_id bigint, tank_id int, battles int, wins int, mark_of_mastery smallint, last_battle_at timestamptz)
  ON CONFLICT (account_id, tank_id) DO UPDATE SET
    battles = EXCLUDED.battles,
    wins = EXCLUDED.wins,
    mark_of_mastery = EXCLUDED.mark_of_mastery,
    last_battle_at = coalesce(EXCLUDED.last_battle_at, player_tank.last_battle_at),
    in_garage = CASE WHEN EXCLUDED.in_garage IS TRUE THEN true ELSE player_tank.in_garage END,
    updated_at = now()
  WHERE player_tank.battles <= EXCLUDED.battles
`;

export const updateMarksSql = (rows: readonly MarksRow[]): Prisma.Sql => Prisma.sql`
  UPDATE player_tank p
  SET marks_on_gun = r.marks, marks_source = 'lesta', updated_at = now()
  FROM jsonb_to_recordset(${toJson(rows.map((row) => ({ account_id: row.accountId, tank_id: row.tankId, marks: row.marks })))}::jsonb)
    AS r(account_id bigint, tank_id int, marks smallint)
  WHERE p.account_id = r.account_id AND p.tank_id = r.tank_id
`;

export const upsertLatestTanksSql = ({ accountId, capturedAt }: LatestTanksSqlInput): Prisma.Sql => Prisma.sql`
  INSERT INTO tank_snapshot_latest (${columns})
  SELECT ${columns} FROM tank_snapshot
  WHERE account_id = ${accountId} AND captured_at = ${capturedAt}
  ON CONFLICT (account_id, tank_id, mode) DO UPDATE SET ${updates}
  WHERE tank_snapshot_latest.captured_at < EXCLUDED.captured_at
`;

export const markSyncedSql = (rows: readonly SyncedRow[]): Prisma.Sql => Prisma.sql`
  UPDATE player p
  SET last_battle_at = r.last_battle_at, last_polled_at = r.last_polled_at, next_poll_at = r.next_poll_at, updated_at = now()
  FROM jsonb_to_recordset(${toJson(
    rows.map((row) => ({
      account_id: row.accountId,
      last_battle_at: row.lastBattleAt,
      last_polled_at: row.lastPolledAt,
      next_poll_at: row.nextPollAt
    }))
  )}::jsonb)
    AS r(account_id bigint, last_battle_at timestamptz, last_polled_at timestamptz, next_poll_at timestamptz)
  WHERE p.account_id = r.account_id
`;

export const upsertAccountModeStatsSql = (rows: readonly AccountModeRow[]): Prisma.Sql => Prisma.sql`
  INSERT INTO account_mode_stats (
    account_id, mode, battles, wins, losses, draws, damage_dealt, damage_received, frags, spotted, xp, survived_battles,
    hits, shots, capture_points, dropped_capture_points, avg_damage_blocked, avg_damage_assisted, max_damage, max_xp, max_frags, updated_at,
    ${recordAtColumns}
  )
  SELECT
    r.account_id, r.mode::stats_mode, r.battles, r.wins, r.losses, r.draws, r.damage_dealt, r.damage_received, r.frags, r.spotted, r.xp,
    r.survived_battles, r.hits, r.shots, r.capture_points, r.dropped_capture_points, r.avg_damage_blocked, r.avg_damage_assisted,
    r.max_damage, r.max_xp, r.max_frags, now(), ${recordAtValues(Prisma.sql`now()`)}
  FROM jsonb_to_recordset(${toJson(
    rows.map((row) => ({
      account_id: row.accountId,
      mode: MODE_STATS_SQL[row.mode],
      battles: row.battles,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      damage_dealt: row.damageDealt,
      damage_received: row.damageReceived,
      frags: row.frags,
      spotted: row.spotted,
      xp: row.xp,
      survived_battles: row.survived,
      hits: row.hits,
      shots: row.shots,
      capture_points: row.capturePoints,
      dropped_capture_points: row.droppedCapturePoints,
      avg_damage_blocked: row.avgDamageBlocked,
      avg_damage_assisted: row.avgDamageAssisted,
      max_damage: row.maxDamage,
      max_xp: row.maxXp,
      max_frags: row.maxFrags
    }))
  )}::jsonb)
    AS r(
      account_id bigint, mode text, battles int, wins int, losses int, draws int, damage_dealt bigint, damage_received bigint, frags int,
      spotted int, xp bigint, survived_battles int, hits int, shots int, capture_points int, dropped_capture_points int,
      avg_damage_blocked float8, avg_damage_assisted float8, max_damage int, max_xp int, max_frags int
    )
  ON CONFLICT (account_id, mode) DO UPDATE SET
    battles = EXCLUDED.battles, wins = EXCLUDED.wins, losses = EXCLUDED.losses, draws = EXCLUDED.draws,
    damage_dealt = EXCLUDED.damage_dealt, damage_received = EXCLUDED.damage_received, frags = EXCLUDED.frags, spotted = EXCLUDED.spotted,
    xp = EXCLUDED.xp, survived_battles = EXCLUDED.survived_battles, hits = EXCLUDED.hits, shots = EXCLUDED.shots,
    capture_points = EXCLUDED.capture_points, dropped_capture_points = EXCLUDED.dropped_capture_points,
    avg_damage_blocked = EXCLUDED.avg_damage_blocked, avg_damage_assisted = EXCLUDED.avg_damage_assisted,
    ${recordAtUpdates}, max_damage = EXCLUDED.max_damage, max_xp = EXCLUDED.max_xp, max_frags = EXCLUDED.max_frags, updated_at = now()
  WHERE account_mode_stats.battles <= EXCLUDED.battles
`;

export const upsertRandomModeStatsSql = ({ accountId, capturedAt }: LatestRandomModeStatsSqlInput): Prisma.Sql => Prisma.sql`
  INSERT INTO account_mode_stats (
    account_id, mode, battles, wins, losses, draws, damage_dealt, damage_received, frags, spotted, xp, survived_battles,
    hits, shots, capture_points, dropped_capture_points, avg_damage_blocked, avg_damage_assisted, max_damage, max_xp, max_frags, updated_at,
    ${recordAtColumns}
  )
  SELECT
    r.account_id, r.mode, r.battles, r.wins, r.losses, r.draws, r.damage_dealt, r.damage_received, r.frags, r.spotted, r.xp,
    r.survived_battles, r.hits, r.shots, r.capture_points, r.dropped_capture_points, r.avg_damage_blocked, r.avg_damage_assisted,
    r.max_damage, r.max_xp, r.max_frags, now(), ${recordAtValues(Prisma.sql`r.captured_at`)}
  FROM account_snapshot r
  WHERE r.account_id = ${accountId} AND r.mode = 'random'::stats_mode AND r.captured_at = ${capturedAt}
  ON CONFLICT (account_id, mode) DO UPDATE SET
    battles = EXCLUDED.battles, wins = EXCLUDED.wins, losses = EXCLUDED.losses, draws = EXCLUDED.draws,
    damage_dealt = EXCLUDED.damage_dealt, damage_received = EXCLUDED.damage_received, frags = EXCLUDED.frags, spotted = EXCLUDED.spotted,
    xp = EXCLUDED.xp, survived_battles = EXCLUDED.survived_battles, hits = EXCLUDED.hits, shots = EXCLUDED.shots,
    capture_points = EXCLUDED.capture_points, dropped_capture_points = EXCLUDED.dropped_capture_points,
    avg_damage_blocked = EXCLUDED.avg_damage_blocked, avg_damage_assisted = EXCLUDED.avg_damage_assisted,
    ${recordAtUpdates}, max_damage = EXCLUDED.max_damage, max_xp = EXCLUDED.max_xp, max_frags = EXCLUDED.max_frags, updated_at = now()
  WHERE account_mode_stats.battles <= EXCLUDED.battles
`;

export const upsertTankModeStatsSql = (rows: readonly TankModeRow[]): Prisma.Sql => Prisma.sql`
  INSERT INTO tank_mode_stats (account_id, tank_id, mode, battles, wins, damage_dealt, frags, spotted, xp, survived_battles, updated_at)
  SELECT r.account_id, r.tank_id, r.mode::stats_mode, r.battles, r.wins, r.damage_dealt, r.frags, r.spotted, r.xp, r.survived_battles, now()
  FROM jsonb_to_recordset(${toJson(
    rows.map((row) => ({
      account_id: row.accountId,
      tank_id: row.tankId,
      mode: MODE_STATS_SQL[row.mode],
      battles: row.battles,
      wins: row.wins,
      damage_dealt: row.damageDealt,
      frags: row.frags,
      spotted: row.spotted,
      xp: row.xp,
      survived_battles: row.survived
    }))
  )}::jsonb)
    AS r(account_id bigint, tank_id int, mode text, battles int, wins int, damage_dealt int, frags int, spotted int, xp int, survived_battles int)
  ON CONFLICT (account_id, tank_id, mode) DO UPDATE SET
    battles = EXCLUDED.battles, wins = EXCLUDED.wins, damage_dealt = EXCLUDED.damage_dealt, frags = EXCLUDED.frags,
    spotted = EXCLUDED.spotted, xp = EXCLUDED.xp, survived_battles = EXCLUDED.survived_battles, updated_at = now()
  WHERE tank_mode_stats.battles <= EXCLUDED.battles
`;

export const upsertPlayersSql = (rows: readonly PlayerIdentityRow[]): Prisma.Sql => Prisma.sql`
  INSERT INTO player (account_id, nickname, clan_id, created_at, tracking_tier, logout_at, updated_at)
  SELECT r.account_id, r.nickname, r.clan_id, r.created_at, r.tracking_tier::tracking_tier, r.logout_at, now()
  FROM jsonb_to_recordset(${toJson(
    rows.map((row) => ({
      account_id: row.accountId,
      nickname: row.nickname,
      clan_id: row.clanId,
      created_at: row.createdAt,
      tracking_tier: row.trackingTier,
      logout_at: row.logoutAt
    }))
  )}::jsonb)
    AS r(account_id bigint, nickname text, clan_id bigint, created_at timestamptz, tracking_tier text, logout_at timestamptz)
  ORDER BY r.account_id
  ON CONFLICT (account_id) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    clan_id = EXCLUDED.clan_id,
    created_at = EXCLUDED.created_at,
    tracking_tier = EXCLUDED.tracking_tier,
    logout_at = coalesce(EXCLUDED.logout_at, player.logout_at),
    updated_at = now()
`;

export const touchNicknamesSql = (rows: readonly PlayerIdentityRow[]): Prisma.Sql => Prisma.sql`
  INSERT INTO player_nickname_history (account_id, nickname, last_seen_at)
  SELECT r.account_id, r.nickname, r.seen_at
  FROM jsonb_to_recordset(${toJson(rows.map((row) => ({ account_id: row.accountId, nickname: row.nickname, seen_at: row.seenAt })))}::jsonb)
    AS r(account_id bigint, nickname text, seen_at timestamptz)
  ORDER BY r.account_id
  ON CONFLICT (account_id, nickname) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
`;
