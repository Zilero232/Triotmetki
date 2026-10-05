import type { ScrubReplayPlayerSqlInput } from './scrub-replay-player.types';

import { Prisma } from '../../../../../../generated';

export const scrubReplayPlayerSql = ({ accountId, placeholder }: ScrubReplayPlayerSqlInput): Prisma.Sql => Prisma.sql`
  UPDATE replay
  SET summary = jsonb_set(
    CASE
      WHEN summary->'recorder'->>'accountId' = ${accountId}::text
        THEN jsonb_set(summary, '{recorder}', (summary->'recorder') || jsonb_build_object('accountId', NULL, 'name', ${placeholder}::text))
      ELSE summary
    END,
    '{players}',
    (
      SELECT coalesce(
        jsonb_agg(
          CASE
            WHEN player->>'accountId' = ${accountId}::text
              THEN player || jsonb_build_object('accountId', NULL, 'name', ${placeholder}::text, 'clanTag', NULL)
            ELSE player
          END
          ORDER BY position
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(summary->'players') WITH ORDINALITY AS listed(player, position)
    )
  )
  WHERE jsonb_typeof(summary->'players') = 'array'
    AND (player_account_ids @> ARRAY[${accountId}]::bigint[] OR summary->'players' @> jsonb_build_array(jsonb_build_object('accountId', ${accountId})))
`;
