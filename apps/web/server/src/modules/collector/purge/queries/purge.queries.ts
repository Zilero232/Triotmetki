import { sql } from 'kysely';

import type { AccountInput, ContainsAccountInput, ScrubReplayPlayerInput } from './purge.types';

import { HYPERTABLE } from '../../../../core';

const containsAccount = ({ column, accountId }: ContainsAccountInput) => sql<boolean>`${sql.ref(column)} @> ARRAY[${accountId}]::bigint[]`;

const summaryListsAccount = (accountId: number) =>
  sql<boolean>`summary->'players' @> jsonb_build_array(jsonb_build_object('accountId', ${accountId}::bigint))`;

const anonymisedRecorder = ({ accountId, placeholder }: Omit<ScrubReplayPlayerInput, 'db'>) => sql`
  CASE
    WHEN summary->'recorder'->>'accountId' = ${accountId}::text
      THEN jsonb_set(summary, '{recorder}', (summary->'recorder') || jsonb_build_object('accountId', NULL, 'name', ${placeholder}::text))
    ELSE summary
  END
`;

const anonymisedPlayers = ({ accountId, placeholder }: Omit<ScrubReplayPlayerInput, 'db'>) => sql`
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
`;

export const deleteAccountTimeSeries = async ({ db, accountId }: AccountInput): Promise<void> => {
  for (const table of Object.values(HYPERTABLE)) {
    await db.deleteFrom(table).where('account_id', '=', accountId).execute();
  }
};

export const scrubReplayPlayer = async ({ db, accountId, placeholder }: ScrubReplayPlayerInput): Promise<void> => {
  await db
    .updateTable('replay')
    .set({
      summary: sql`jsonb_set(${anonymisedRecorder({ accountId, placeholder })}, '{players}', ${anonymisedPlayers({ accountId, placeholder })})`
    })
    .where(sql`jsonb_typeof(summary->'players')`, '=', 'array')
    .where((eb) => eb.or([containsAccount({ column: 'player_account_ids', accountId }), summaryListsAccount(accountId)]))
    .execute();
};

export const removeAccountFromReplayPlayers = async ({ db, accountId }: AccountInput): Promise<void> => {
  await db
    .updateTable('replay')
    .set((eb) => ({ player_account_ids: eb.fn('array_remove', [eb.ref('player_account_ids'), eb.val(accountId)]) }))
    .where(containsAccount({ column: 'player_account_ids', accountId }))
    .execute();
};

export const removeAccountFromRngPlayers = async ({ db, accountId }: AccountInput): Promise<void> => {
  await db
    .updateTable('rng_daily')
    .set((eb) => ({ players: eb.fn('array_remove', [eb.ref('players'), eb.val(accountId)]) }))
    .where(containsAccount({ column: 'players', accountId }))
    .execute();
};

export const PURGE_QUERIES = {
  deleteAccountTimeSeries,
  scrubReplayPlayer,
  removeAccountFromReplayPlayers,
  removeAccountFromRngPlayers
} as const;
