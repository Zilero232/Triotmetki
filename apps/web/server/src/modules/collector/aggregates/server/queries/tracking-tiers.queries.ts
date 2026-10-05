import type { Database } from '../../../../../core';
import type { DemoteIdleInput, PromotePinnedInput } from './server.types';

const pinnedAccounts = (db: Database) =>
  db
    .selectFrom('follow')
    .select('target_id as account_id')
    .where('kind', '=', 'player')
    .union(db.selectFrom('user_lesta_account').select('account_id'))
    .union(
      db
        .selectFrom('mod_device')
        .select((eb) => eb.ref('account_id').$notNull().as('account_id'))
        .where('revoked_at', 'is', null)
        .where('account_id', 'is not', null)
    );

export const promotePinned = async ({ db, now }: PromotePinnedInput) => {
  const result = await db
    .updateTable('player')
    .set((eb) => ({ tracking_tier: 'active', next_poll_at: now, updated_at: eb.fn<Date>('now') }))
    .where('tracking_tier', '<>', 'active')
    .where('account_id', 'in', pinnedAccounts(db))
    .executeTakeFirst();

  return Number(result.numUpdatedRows);
};

export const demoteIdle = async ({ db, idleSince }: DemoteIdleInput) => {
  const result = await db
    .updateTable('player')
    .set((eb) => ({ tracking_tier: 'population', updated_at: eb.fn<Date>('now') }))
    .where('tracking_tier', '=', 'active')
    .where((eb) => eb.or([eb('last_viewed_at', 'is', null), eb('last_viewed_at', '<', idleSince)]))
    .where((eb) =>
      eb.not(
        eb.exists(
          eb.selectFrom(pinnedAccounts(db).as('pinned')).select(eb.lit(1).as('found')).whereRef('pinned.account_id', '=', 'player.account_id')
        )
      )
    )
    .executeTakeFirst();

  return Number(result.numUpdatedRows);
};
