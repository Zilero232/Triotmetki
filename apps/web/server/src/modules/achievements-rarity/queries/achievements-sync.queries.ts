import type { FetchCandidatesInput } from './achievements-sync.types';

import { ACHIEVEMENTS_FETCH } from '../config/fetch.constants';

export const fetchCandidates = ({ db, staleBefore, limit }: FetchCandidatesInput) =>
  db
    .selectFrom('player')
    .leftJoin('account_achievements', 'account_achievements.account_id', 'player.account_id')
    .select('player.account_id as accountId')
    .where('player.tracking_tier', 'in', ACHIEVEMENTS_FETCH.tiers)
    .where('player.is_hidden', '=', false)
    .where((eb) => eb.or([eb('account_achievements.fetched_at', 'is', null), eb('account_achievements.fetched_at', '<', staleBefore)]))
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom('data_deletion_request')
            .select(eb.lit(1).as('blocked'))
            .whereRef('data_deletion_request.account_id', '=', 'player.account_id')
            .where('data_deletion_request.source', 'in', ACHIEVEMENTS_FETCH.blockingSources)
            .where('data_deletion_request.status', 'in', ACHIEVEMENTS_FETCH.blockingStatuses)
        )
      )
    )
    .orderBy('account_achievements.fetched_at', (order) => order.asc().nullsFirst())
    .orderBy('player.last_battle_at', (order) => order.desc().nullsLast())
    .orderBy('player.account_id', 'asc')
    .limit(limit)
    .execute();

export const achievementsSyncQueries = { fetchCandidates } as const;
