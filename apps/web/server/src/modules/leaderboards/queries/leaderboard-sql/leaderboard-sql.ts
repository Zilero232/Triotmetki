import type { LeaderboardQuery } from '@otmetki/schemas';

import type { LeaderboardSql, LeaderboardSqlInput, PlayersSqlInput, RisingStarsSqlInput } from './leaderboard-sql.types';

import { Prisma } from '../../../../../generated';
import { RATING_PERIOD_SQL } from '../../../../common/lib';
import { ACCOUNT_RATING_COLUMN, CLAN_SNAPSHOT_COLUMN, TANK_RATING_COLUMN } from '../../config';

export const streamersFilterSql = Prisma.sql`AND ar.account_id IN (SELECT account_id FROM streamer_profile WHERE account_id IS NOT NULL)`;

const pageOf = (query: LeaderboardQuery): Prisma.Sql => Prisma.sql`LIMIT ${query.limit} OFFSET ${query.offset}`;

export const playersSql = ({ query, minBattles, filter = Prisma.empty }: PlayersSqlInput): LeaderboardSql => {
  const column = Prisma.raw(`ar.${ACCOUNT_RATING_COLUMN[query.metric]}`);
  const from = Prisma.sql`
    FROM account_rating ar
    JOIN player p ON p.account_id = ar.account_id AND NOT p.is_hidden
  `;

  const where = Prisma.sql`
    WHERE ar.period = ${RATING_PERIOD_SQL[query.period]}::rating_period AND ar.battles >= ${minBattles} AND ${column} IS NOT NULL ${filter}
  `;

  return {
    page: Prisma.sql`
      SELECT ar.account_id AS "accountId", NULL::bigint AS "clanId", coalesce(sp.display_name, p.nickname) AS name, c.tag AS "clanTag", NULL::text AS color,
             ${column}::float8 AS value, ar.battles::float8 AS battles, NULL::float8 AS delta
      ${from}
      LEFT JOIN clan c ON c.clan_id = p.clan_id
      LEFT JOIN streamer_profile sp ON sp.account_id = ar.account_id
      ${where}
      ORDER BY ${column} DESC
      ${pageOf(query)}
    `,
    total: Prisma.sql`SELECT count(*) AS total ${from} ${where}`
  };
};

export const tankPlayersSql = ({ query, minBattles }: LeaderboardSqlInput): LeaderboardSql => {
  const column = Prisma.raw(TANK_RATING_COLUMN[query.metric]);
  const tankFilter = query.tankId === undefined ? Prisma.empty : Prisma.sql`AND atr.tank_id = ${query.tankId}`;
  const tierFilter = query.tier === undefined ? Prisma.empty : Prisma.sql`AND v.tier = ${query.tier}`;
  const typeFilter = query.type === undefined ? Prisma.empty : Prisma.sql`AND v.type::text = ${query.type}`;
  const ranked = Prisma.sql`
    WITH agg AS (
      SELECT atr.account_id,
             sum(atr.battles)::float8 AS battles,
             (sum(atr.${column} * atr.battles) FILTER (WHERE atr.${column} IS NOT NULL)
               / nullif(sum(atr.battles) FILTER (WHERE atr.${column} IS NOT NULL), 0))::float8 AS value
      FROM account_tank_rating atr
      JOIN vehicle v ON v.tank_id = atr.tank_id
      WHERE atr.period = ${RATING_PERIOD_SQL[query.period]}::rating_period ${tankFilter} ${tierFilter} ${typeFilter}
      GROUP BY atr.account_id
      HAVING sum(atr.battles) >= ${minBattles}
    )
  `;

  const from = Prisma.sql`
    FROM agg
    JOIN player p ON p.account_id = agg.account_id AND NOT p.is_hidden
  `;

  const where = Prisma.sql`WHERE agg.value IS NOT NULL`;

  return {
    page: Prisma.sql`
      ${ranked}
      SELECT agg.account_id AS "accountId", NULL::bigint AS "clanId", p.nickname AS name, c.tag AS "clanTag", NULL::text AS color,
             agg.value, agg.battles, NULL::float8 AS delta
      ${from}
      LEFT JOIN clan c ON c.clan_id = p.clan_id
      ${where}
      ORDER BY agg.value DESC
      ${pageOf(query)}
    `,
    total: Prisma.sql`${ranked} SELECT count(*) AS total ${from} ${where}`
  };
};

export const clansSql = (query: LeaderboardQuery): LeaderboardSql => {
  const column = Prisma.raw(`s.${CLAN_SNAPSHOT_COLUMN[query.metric]}`);
  const source = Prisma.sql`
    FROM clan c
    CROSS JOIN LATERAL (
      SELECT * FROM clan_snapshot WHERE clan_id = c.clan_id ORDER BY captured_at DESC LIMIT 1
    ) s
    WHERE NOT c.is_disbanded AND ${column} IS NOT NULL
  `;

  return {
    page: Prisma.sql`
      SELECT NULL::bigint AS "accountId", c.clan_id AS "clanId", c.name, c.tag AS "clanTag", c.color,
             ${column}::float8 AS value, coalesce(s.battles_delta, 0)::float8 AS battles, NULL::float8 AS delta
      ${source}
      ORDER BY ${column} DESC
      ${pageOf(query)}
    `,
    total: Prisma.sql`SELECT count(*) AS total ${source}`
  };
};

export const risingStarsSql = ({ query, period, minBattles }: RisingStarsSqlInput): LeaderboardSql => {
  const column = Prisma.raw(ACCOUNT_RATING_COLUMN[query.metric]);
  const from = Prisma.sql`
    FROM account_rating r
    JOIN account_rating o ON o.account_id = r.account_id AND o.period = 'overall'::rating_period
    JOIN player p ON p.account_id = r.account_id AND NOT p.is_hidden
  `;

  const where = Prisma.sql`
    WHERE r.period = ${RATING_PERIOD_SQL[period]}::rating_period AND r.battles >= ${minBattles}
      AND r.${column} IS NOT NULL AND o.${column} IS NOT NULL
  `;

  return {
    page: Prisma.sql`
      SELECT r.account_id AS "accountId", NULL::bigint AS "clanId", p.nickname AS name, c.tag AS "clanTag", NULL::text AS color,
             r.${column}::float8 AS value, r.battles::float8 AS battles, (r.${column} - o.${column})::float8 AS delta
      ${from}
      LEFT JOIN clan c ON c.clan_id = p.clan_id
      ${where}
      ORDER BY delta DESC
      ${pageOf(query)}
    `,
    total: Prisma.sql`SELECT count(*) AS total ${from} ${where}`
  };
};

export const marksSql = (query: LeaderboardQuery): LeaderboardSql => ({
  page: Prisma.sql`
    SELECT pt.account_id AS "accountId", NULL::bigint AS "clanId", p.nickname AS name, c.tag AS "clanTag", NULL::text AS color,
           count(*)::float8 AS value, sum(pt.battles)::float8 AS battles, NULL::float8 AS delta
    FROM player_tank pt
    JOIN player p ON p.account_id = pt.account_id AND NOT p.is_hidden
    LEFT JOIN clan c ON c.clan_id = p.clan_id
    WHERE pt.marks_on_gun = 3 AND pt.marks_source = 'lesta' AND pt.battles > 0
    GROUP BY pt.account_id, p.nickname, c.tag
    ORDER BY value DESC
    ${pageOf(query)}
  `,
  total: Prisma.sql`
    SELECT count(DISTINCT pt.account_id) AS total
    FROM player_tank pt
    JOIN player p ON p.account_id = pt.account_id AND NOT p.is_hidden
    WHERE pt.marks_on_gun = 3 AND pt.marks_source = 'lesta' AND pt.battles > 0
  `
});
