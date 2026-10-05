import type { FeedScope, FeedSqlInput } from './best-battles-feed.types';

import { Prisma } from '../../../../../generated';
import { corroboratedBattleSql } from '../../../mod';
import { BEST_BATTLE_METRIC_COLUMN } from '../../config';

const modScopeSql = ({ since, battleTypes, tankIds, arenaId, medal }: FeedScope): Prisma.Sql => Prisma.sql`
  b.started_at >= ${since}
  AND ${corroboratedBattleSql}
  AND b.battle_type = ANY(${battleTypes}::text[])
  ${tankIds ? Prisma.sql`AND b.tank_id = ANY(${tankIds}::int[])` : Prisma.empty}
  ${arenaId ? Prisma.sql`AND b.arena_id = ${arenaId}` : Prisma.empty}
  ${medal ? Prisma.sql`AND ${medal} = ANY(b.achievements)` : Prisma.empty}
`;

const replayScopeSql = ({ since, battleTypes, tankIds, arenaId, medal }: FeedScope): Prisma.Sql => Prisma.sql`
  r.visibility = 'public'
  AND r.status = 'parsed'
  AND r.played_at >= ${since}
  AND r.battle_type = ANY(${battleTypes}::text[])
  AND r.account_id IS NOT NULL
  AND r.tank_id IS NOT NULL
  AND p.is_hidden IS NOT TRUE
  AND EXISTS (SELECT 1 FROM user_lesta_account uploader WHERE uploader.user_id = r.uploader_user_id AND uploader.account_id = r.account_id)
  AND NOT EXISTS (SELECT 1 FROM battle b WHERE b.account_id = r.account_id AND b.arena_unique_id = r.arena_unique_id AND ${corroboratedBattleSql})
  ${tankIds ? Prisma.sql`AND r.tank_id = ANY(${tankIds}::int[])` : Prisma.empty}
  ${arenaId ? Prisma.sql`AND r.arena_id = ${arenaId}` : Prisma.empty}
  ${medal ? Prisma.sql`AND ${medal} = ANY(r.medals)` : Prisma.empty}
`;

const recorderResultSql = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT round((player->'result'->>'spotted')::numeric)::int AS spotted,
           round((player->'result'->>'blocked')::numeric)::int AS blocked
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(r.summary->'players') = 'array' THEN r.summary->'players' ELSE '[]'::jsonb END
    ) AS player
    WHERE player->>'isRecorder' = 'true'
    LIMIT 1
  ) rec ON TRUE
`;

export const modFeedSql = ({ metric, take, ...scope }: FeedSqlInput): Prisma.Sql => {
  const column = Prisma.raw(BEST_BATTLE_METRIC_COLUMN[metric]);

  return Prisma.sql`
    SELECT feed.*, rp.id AS replay_id
    FROM (
      SELECT 'mod' AS source,
             b.id AS battle_id,
             b.account_id,
             b.arena_unique_id,
             p.nickname,
             b.tank_id,
             b.arena_id,
             NULL::text AS map_name,
             b.result::text AS result,
             b.damage_dealt AS damage,
             (b.damage_assisted_radio + b.damage_assisted_track + b.damage_assisted_stun) AS assisted,
             b.spotted,
             b.frags,
             b.xp,
             b.damage_blocked AS blocked,
             b.achievements AS medals,
             b.started_at AS played_at
      FROM battle b
      JOIN player p ON p.account_id = b.account_id AND NOT p.is_hidden
      WHERE ${modScopeSql(scope)}
      ORDER BY ${column} DESC, played_at DESC, battle_id
      LIMIT ${take}
    ) feed
    LEFT JOIN LATERAL (
      SELECT r.id
      FROM replay r
      WHERE r.account_id = feed.account_id
        AND r.arena_unique_id = feed.arena_unique_id
        AND r.visibility = 'public'
        AND r.status = 'parsed'
      ORDER BY r.created_at
      LIMIT 1
    ) rp ON TRUE
    ORDER BY feed.${column} DESC, feed.played_at DESC, feed.battle_id
  `;
};

export const replayFeedSql = ({ metric, take, ...scope }: FeedSqlInput): Prisma.Sql => {
  const column = Prisma.raw(BEST_BATTLE_METRIC_COLUMN[metric]);

  return Prisma.sql`
    SELECT feed.*
    FROM (
      SELECT 'replay' AS source,
             r.id AS battle_id,
             r.account_id,
             r.arena_unique_id,
             COALESCE(p.nickname, r.summary->'recorder'->>'name') AS nickname,
             r.tank_id,
             r.arena_id,
             r.map_name,
             r.result::text AS result,
             r.damage_dealt AS damage,
             r.damage_assisted AS assisted,
             rec.spotted,
             r.frags,
             r.xp,
             rec.blocked,
             r.medals,
             r.played_at,
             r.id AS replay_id
      FROM replay r
      LEFT JOIN player p ON p.account_id = r.account_id
      ${recorderResultSql}
      WHERE ${replayScopeSql(scope)}
    ) feed
    WHERE feed.${column} IS NOT NULL
    ORDER BY feed.${column} DESC, feed.played_at DESC, feed.battle_id
    LIMIT ${take}
  `;
};

export const feedScopeSql = { mod: modScopeSql, replay: replayScopeSql, recorderResult: recorderResultSql } as const;
