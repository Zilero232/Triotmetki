import type { RatingPeriod } from '../../../../../../generated';
import type { ReplaceAccountRatingsSqlInput, ReplaceAccountTankRatingsSqlInput } from './account-rating-writes.types';

import { Prisma } from '../../../../../../generated';
import { RATING_PERIOD_FROM_DB, RATING_PERIOD_SQL } from '../../../../../common/lib';

const periodSql = (period: RatingPeriod): string => RATING_PERIOD_SQL[RATING_PERIOD_FROM_DB[period]];

export const replaceAccountRatingsSql = ({ accountId, rows }: ReplaceAccountRatingsSqlInput): Prisma.Sql => Prisma.sql`
  WITH incoming AS (
    SELECT
      r.period::rating_period AS period, r.battles, r.win_rate, r.avg_damage, r.avg_frags, r.avg_tier, r.wn8, r.eff, r.brone_index,
      r.from_captured_at, r.to_captured_at
    FROM jsonb_to_recordset(${JSON.stringify(
      rows.map((row) => ({
        period: periodSql(row.period),
        battles: row.battles,
        win_rate: row.winRate,
        avg_damage: row.avgDamage,
        avg_frags: row.avgFrags,
        avg_tier: row.avgTier ?? null,
        wn8: row.wn8 ?? null,
        eff: row.eff ?? null,
        brone_index: row.broneIndex ?? null,
        from_captured_at: row.fromCapturedAt ?? null,
        to_captured_at: row.toCapturedAt ?? null
      }))
    )}::jsonb)
      AS r(
        period text, battles int, win_rate float8, avg_damage float8, avg_frags float8, avg_tier float8, wn8 float8, eff float8,
        brone_index float8, from_captured_at timestamptz, to_captured_at timestamptz
      )
  ),
  upserted AS (
    INSERT INTO account_rating AS stored (
      account_id, period, battles, win_rate, avg_damage, avg_frags, avg_tier, wn8, eff, brone_index, from_captured_at, to_captured_at,
      computed_at
    )
    SELECT
      ${accountId}, period, battles, win_rate, avg_damage, avg_frags, avg_tier, wn8, eff, brone_index, from_captured_at, to_captured_at,
      now()
    FROM incoming
    ON CONFLICT (account_id, period) DO UPDATE SET
      battles = EXCLUDED.battles, win_rate = EXCLUDED.win_rate, avg_damage = EXCLUDED.avg_damage, avg_frags = EXCLUDED.avg_frags,
      avg_tier = EXCLUDED.avg_tier, wn8 = EXCLUDED.wn8, eff = EXCLUDED.eff, brone_index = EXCLUDED.brone_index,
      from_captured_at = EXCLUDED.from_captured_at, to_captured_at = EXCLUDED.to_captured_at, computed_at = EXCLUDED.computed_at
    WHERE (
      stored.battles, stored.win_rate, stored.avg_damage, stored.avg_frags, stored.avg_tier, stored.wn8, stored.eff, stored.brone_index,
      stored.from_captured_at, stored.to_captured_at
    ) IS DISTINCT FROM (
      EXCLUDED.battles, EXCLUDED.win_rate, EXCLUDED.avg_damage, EXCLUDED.avg_frags, EXCLUDED.avg_tier, EXCLUDED.wn8, EXCLUDED.eff,
      EXCLUDED.brone_index, EXCLUDED.from_captured_at, EXCLUDED.to_captured_at
    )
  )
  DELETE FROM account_rating stale
  WHERE stale.account_id = ${accountId} AND NOT EXISTS (SELECT 1 FROM incoming WHERE incoming.period = stale.period)
`;

export const replaceAccountTankRatingsSql = ({ accountId, rows }: ReplaceAccountTankRatingsSqlInput): Prisma.Sql => Prisma.sql`
  WITH incoming AS (
    SELECT r.tank_id, r.period::rating_period AS period, r.battles, r.win_rate, r.avg_damage, r.avg_frags, r.avg_xp, r.wn8, r.damage_percentile
    FROM jsonb_to_recordset(${JSON.stringify(
      rows.map((row) => ({
        tank_id: row.tankId,
        period: periodSql(row.period),
        battles: row.battles,
        win_rate: row.winRate,
        avg_damage: row.avgDamage,
        avg_frags: row.avgFrags,
        avg_xp: row.avgXp,
        wn8: row.wn8 ?? null,
        damage_percentile: row.damagePercentile ?? null
      }))
    )}::jsonb)
      AS r(
        tank_id int, period text, battles int, win_rate float8, avg_damage float8, avg_frags float8, avg_xp float8, wn8 float8,
        damage_percentile float8
      )
  ),
  upserted AS (
    INSERT INTO account_tank_rating AS stored (
      account_id, tank_id, period, battles, win_rate, avg_damage, avg_frags, avg_xp, wn8, damage_percentile, computed_at
    )
    SELECT ${accountId}, tank_id, period, battles, win_rate, avg_damage, avg_frags, avg_xp, wn8, damage_percentile, now()
    FROM incoming
    ON CONFLICT (account_id, tank_id, period) DO UPDATE SET
      battles = EXCLUDED.battles, win_rate = EXCLUDED.win_rate, avg_damage = EXCLUDED.avg_damage, avg_frags = EXCLUDED.avg_frags,
      avg_xp = EXCLUDED.avg_xp, wn8 = EXCLUDED.wn8, damage_percentile = EXCLUDED.damage_percentile, computed_at = EXCLUDED.computed_at
    WHERE (
      stored.battles, stored.win_rate, stored.avg_damage, stored.avg_frags, stored.avg_xp, stored.wn8, stored.damage_percentile
    ) IS DISTINCT FROM (
      EXCLUDED.battles, EXCLUDED.win_rate, EXCLUDED.avg_damage, EXCLUDED.avg_frags, EXCLUDED.avg_xp, EXCLUDED.wn8,
      EXCLUDED.damage_percentile
    )
  )
  DELETE FROM account_tank_rating stale
  WHERE stale.account_id = ${accountId}
    AND NOT EXISTS (SELECT 1 FROM incoming WHERE incoming.tank_id = stale.tank_id AND incoming.period = stale.period)
`;
