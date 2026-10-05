import { sql } from 'kysely';

import type { ClanListFiltersInput, ClanListPageInput } from './clan-list.types';

import { escapeLike } from '../../../common/lib';
import { CLAN_LIST_DEFAULT_SORT, CLAN_LIST_SORT } from '../config/clan-list.constants';

const clanListFilters = ({ eb, query }: ClanListFiltersInput) => {
  const pattern = query.search ? `%${escapeLike(query.search)}%` : null;

  return [
    eb('clan.is_disbanded', '=', false),
    ...(pattern === null ? [] : [eb.or([eb('clan.tag', 'ilike', pattern), eb('clan.name', 'ilike', pattern)])]),
    ...(query.minMembers === undefined ? [] : [eb('clan.members_count', '>=', query.minMembers)]),
    ...(query.minWn8 === undefined ? [] : [eb('latest.avg_wn8', '>=', query.minWn8)]),
    ...(query.minWinRate === undefined ? [] : [eb('latest.avg_win_rate', '>=', query.minWinRate)]),
    ...(query.minStrongholdLevel === undefined ? [] : [eb('clan.stronghold_level', '>=', query.minStrongholdLevel)])
  ];
};

const clanListPage = ({ db, query }: ClanListPageInput) => {
  const sort = sql.ref(CLAN_LIST_SORT[query.sort ?? CLAN_LIST_DEFAULT_SORT]);

  return db
    .selectFrom('clan')
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('clan_snapshot')
          .select(['avg_wn8', 'avg_win_rate', 'active_members_7d', 'elo_rating_10'])
          .whereRef('clan_snapshot.clan_id', '=', 'clan.clan_id')
          .orderBy('clan_snapshot.captured_at', 'desc')
          .limit(1)
          .as('latest'),
      (join) => join.onTrue()
    )
    .where((eb) => eb.and(clanListFilters({ eb, query })))
    .select((eb) => [
      'clan.clan_id as clanId',
      'clan.tag',
      'clan.name',
      'clan.color',
      'clan.motto',
      'clan.emblems',
      'clan.members_count as membersCount',
      'clan.created_at as createdAt',
      'clan.is_disbanded as isDisbanded',
      'latest.avg_wn8 as avgWn8',
      'latest.avg_win_rate as avgWinRate',
      'latest.active_members_7d as activeMembers7d',
      'latest.elo_rating_10 as eloRating10',
      'clan.stronghold_level as strongholdLevel',
      eb.fn.countAll<number>().over().as('total')
    ])
    .orderBy(sort, (order) => (query.order === 'asc' ? order.asc() : order.desc()).nullsLast())
    .orderBy('clan.clan_id')
    .limit(query.limit)
    .offset(query.offset)
    .execute();
};

export const clanListQueries = { clanListPage } as const;
