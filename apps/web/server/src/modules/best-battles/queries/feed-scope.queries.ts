import type { ScopedBattlesInput } from './feed-scope.types';

import { corroboratedBattle } from '../../mod';

export const scopedModBattles = ({ db, since, battleTypes, tankIds, arenaId, medal }: ScopedBattlesInput) =>
  db
    .selectFrom('battle')
    .innerJoin('player as p', (join) => join.onRef('p.account_id', '=', 'battle.account_id').on('p.is_hidden', '=', false))
    .where('battle.started_at', '>=', since)
    .where(corroboratedBattle)
    .where('battle.battle_type', 'in', battleTypes)
    .$call((query) => (tankIds === null ? query : query.where('battle.tank_id', 'in', tankIds)))
    .$call((query) => (arenaId === undefined ? query : query.where('battle.arena_id', '=', arenaId)))
    .$call((query) => (medal === undefined ? query : query.where((eb) => eb(eb.val(medal), '=', eb.fn.any('battle.achievements')))));

export const scopedReplays = ({ db, since, battleTypes, tankIds, arenaId, medal }: ScopedBattlesInput) =>
  db
    .selectFrom('replay as r')
    .leftJoin('player as p', 'p.account_id', 'r.account_id')
    .where('r.visibility', '=', 'public')
    .where('r.status', '=', 'parsed')
    .where('r.played_at', '>=', since)
    .where('r.battle_type', 'in', battleTypes)
    .where('r.account_id', 'is not', null)
    .where('r.tank_id', 'is not', null)
    .where('p.is_hidden', 'is not', true)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('user_lesta_account as uploader')
          .select(eb.lit(1).as('found'))
          .whereRef('uploader.user_id', '=', 'r.uploader_user_id')
          .whereRef('uploader.account_id', '=', 'r.account_id')
      )
    )
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom('battle')
            .select(eb.lit(1).as('found'))
            .whereRef('battle.account_id', '=', 'r.account_id')
            .whereRef('battle.arena_unique_id', '=', 'r.arena_unique_id')
            .where(corroboratedBattle)
        )
      )
    )
    .$call((query) => (tankIds === null ? query : query.where('r.tank_id', 'in', tankIds)))
    .$call((query) => (arenaId === undefined ? query : query.where('r.arena_id', '=', arenaId)))
    .$call((query) => (medal === undefined ? query : query.where((eb) => eb(eb.val(medal), '=', eb.fn.any('r.medals')))));
