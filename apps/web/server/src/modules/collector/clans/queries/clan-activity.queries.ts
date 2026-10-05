import type { ClanActivityInput } from './clan-activity.types';

import { RATING_PERIOD_SQL, STATS_MODE_SQL } from '../../../../common/lib';

export const clanActivity = ({ db, clanIds, battlesSince, activeSince }: ClanActivityInput) =>
  db
    .selectFrom('clan_member as cm')
    .innerJoin('player as p', 'p.account_id', 'cm.account_id')
    .leftJoin('account_rating as ar', (join) => join.onRef('ar.account_id', '=', 'cm.account_id').on('ar.period', '=', RATING_PERIOD_SQL.overall))
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('account_snapshot')
          .select('battles')
          .whereRef('account_snapshot.account_id', '=', 'cm.account_id')
          .where('account_snapshot.mode', '=', STATS_MODE_SQL.all)
          .orderBy('account_snapshot.captured_at', 'desc')
          .limit(1)
          .as('latest'),
      (join) => join.onTrue()
    )
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('account_snapshot')
          .select('battles')
          .whereRef('account_snapshot.account_id', '=', 'cm.account_id')
          .where('account_snapshot.mode', '=', STATS_MODE_SQL.all)
          .where('account_snapshot.captured_at', '<=', battlesSince)
          .orderBy('account_snapshot.captured_at', 'desc')
          .limit(1)
          .as('base'),
      (join) => join.onTrue()
    )
    .select((eb) => [
      'cm.clan_id as clanId',
      eb.fn
        .sum<number | null>(eb('latest.battles', '-', eb.ref('base.battles')))
        .filterWhereRef('latest.battles', '>=', 'base.battles')
        .as('battlesDelta'),
      eb.fn.avg<number | null>('ar.wn8').as('avgWn8'),
      eb.fn.avg<number | null>('ar.win_rate').as('avgWinRate'),
      eb.fn.countAll<number>().filterWhere('p.last_battle_at', '>=', activeSince).as('activeMembers7d')
    ])
    .where('cm.clan_id', 'in', clanIds)
    .groupBy('cm.clan_id')
    .execute();
