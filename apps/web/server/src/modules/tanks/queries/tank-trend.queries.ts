import type { TankTrendRowsInput } from './tank-trend.types';

import { moscowDayText, statSums } from '../../../core';

export const tankTrendRows = ({ db, tankId, mode, from, recent, recentDay }: TankTrendRowsInput) =>
  db
    .with('sums', (query) =>
      query
        .selectFrom('tank_daily_stats')
        .select(moscowDayText('day').as('day'))
        .select(statSums(['battles', 'wins', 'damage']))
        .where('tank_id', '=', tankId)
        .where('mode', '=', mode)
        .where('day', '>=', from)
        .groupBy('day')
    )
    .with('players', (query) =>
      query
        .selectFrom('tank_battle_delta')
        .select((eb) => [moscowDayText('captured_at').as('day'), eb.fn.count<number>('account_id').distinct().as('players')])
        .where('tank_id', '=', tankId)
        .where('mode', '=', mode)
        .where('captured_at', '>=', recent)
        .groupBy('day')
    )
    .selectFrom('sums')
    .leftJoin('players', 'players.day', 'sums.day')
    .select(['sums.day', 'sums.battles', 'sums.wins', 'sums.damage'])
    .select((eb) =>
      eb
        .case()
        .when('sums.day', '>=', recentDay)
        .then(eb.fn.coalesce('players.players', eb.lit(0)))
        .end()
        .as('players')
    )
    .orderBy('sums.day')
    .execute();
