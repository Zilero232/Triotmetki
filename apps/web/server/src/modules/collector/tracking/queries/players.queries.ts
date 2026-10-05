import { sortBy } from 'remeda';

import type { ClaimDueActivePlayersInput, MarkSyncedInput, PlayerIdentityRow, UpsertPlayersInput } from './players.types';

import { valuesTable } from '../../../../core';

const inAccountOrder = (rows: readonly PlayerIdentityRow[]) => sortBy(rows, (row) => row.accountId);

export const upsertPlayers = async ({ db, rows }: UpsertPlayersInput): Promise<void> => {
  await db
    .insertInto('player')
    .values(
      inAccountOrder(rows).map((row) => ({
        account_id: Number(row.accountId),
        nickname: row.nickname,
        clan_id: row.clanId === null ? null : Number(row.clanId),
        created_at: row.createdAt,
        tracking_tier: row.trackingTier,
        logout_at: row.logoutAt,
        updated_at: db.fn<Date>('now')
      }))
    )
    .onConflict((conflict) =>
      conflict.column('account_id').doUpdateSet((eb) => ({
        nickname: eb.ref('excluded.nickname'),
        clan_id: eb.ref('excluded.clan_id'),
        created_at: eb.ref('excluded.created_at'),
        tracking_tier: eb.ref('excluded.tracking_tier'),
        logout_at: eb.fn.coalesce('excluded.logout_at', 'player.logout_at'),
        updated_at: eb.fn<Date>('now')
      }))
    )
    .execute();
};

export const touchNicknames = async ({ db, rows }: UpsertPlayersInput): Promise<void> => {
  await db
    .insertInto('player_nickname_history')
    .values(inAccountOrder(rows).map((row) => ({ account_id: Number(row.accountId), nickname: row.nickname, last_seen_at: row.seenAt })))
    .onConflict((conflict) => conflict.columns(['account_id', 'nickname']).doUpdateSet((eb) => ({ last_seen_at: eb.ref('excluded.last_seen_at') })))
    .execute();
};

export const markSynced = async ({ db, rows }: MarkSyncedInput): Promise<void> => {
  const synced = valuesTable({
    rows: rows.map((row) => ({
      account_id: row.accountId,
      last_battle_at: row.lastBattleAt,
      last_polled_at: row.lastPolledAt,
      next_poll_at: row.nextPollAt
    })),
    alias: 'synced',
    types: { account_id: 'bigint', last_battle_at: 'timestamptz', last_polled_at: 'timestamptz', next_poll_at: 'timestamptz' }
  });

  await db
    .updateTable('player')
    .from(synced)
    .set((eb) => ({
      last_battle_at: eb.ref('synced.last_battle_at'),
      last_polled_at: eb.ref('synced.last_polled_at'),
      next_poll_at: eb.ref('synced.next_poll_at'),
      updated_at: eb.fn<Date>('now')
    }))
    .whereRef('player.account_id', '=', 'synced.account_id')
    .execute();
};

export const claimDueActivePlayers = async ({ db, now, nextPollAt, limit }: ClaimDueActivePlayersInput): Promise<number[]> => {
  const claimed = await db
    .updateTable('player')
    .set((eb) => ({ next_poll_at: nextPollAt, updated_at: eb.fn<Date>('now') }))
    .where('account_id', 'in', (eb) =>
      eb
        .selectFrom('player')
        .select('account_id')
        .where('tracking_tier', '=', 'active')
        .where((due) => due.or([due('next_poll_at', 'is', null), due('next_poll_at', '<=', now)]))
        .orderBy('next_poll_at', (order) => order.asc().nullsFirst())
        .limit(limit)
        .forUpdate()
        .skipLocked()
    )
    .returning('account_id')
    .execute();

  return claimed.map((row) => row.account_id);
};

export const PLAYER_QUERIES = { upsertPlayers, touchNicknames, markSynced, claimDueActivePlayers } as const;
