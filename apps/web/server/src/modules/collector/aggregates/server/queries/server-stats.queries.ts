import type { DailyStatsInput, ServerPlayersInput } from './server.types';

import { statSums } from '../../../../../core';
import { SERVER_STATS } from '../lib/server-stats/server-stats.constants';

export const serverPlayers = async ({ db, mode, sinces, until }: ServerPlayersInput) => {
  const earliest = new Date(Math.min(...sinces.map((since) => since.getTime())));

  const windowed = db.selectFrom('tank_battle_delta').where('mode', '=', mode).where('captured_at', '>=', earliest).where('captured_at', '<', until);

  const rows = await windowed
    .select((eb) => [
      'tank_id',
      eb.cast<string>('cohort', 'text').as('cohort'),
      ...sinces.map((since, index) => eb.fn.count<number>('account_id').distinct().filterWhere('captured_at', '>=', since).as(`players_${index}`))
    ])
    .groupBy(['tank_id', 'cohort'])
    .unionAll(
      windowed
        .select((eb) => [
          'tank_id',
          eb.cast<string>(eb.val(SERVER_STATS.allCohorts), 'text').as('cohort'),
          ...sinces.map((since, index) => eb.fn.count<number>('account_id').distinct().filterWhere('captured_at', '>=', since).as(`players_${index}`))
        ])
        .groupBy('tank_id')
    )
    .execute();

  return rows.map((row) => ({ tankId: row.tank_id, cohort: row.cohort, players: sinces.map((_, index) => row[`players_${index}`] ?? 0) }));
};

export const dailyStats = ({ db, mode, since, until }: DailyStatsInput) =>
  db
    .selectFrom('tank_daily_stats')
    .select((eb) => ['tank_id as tankId', eb.cast<string>('cohort', 'text').as('cohort')])
    .select(statSums(['samples', 'battles', 'wins', 'damage', 'frags', 'spotted', 'xp', 'blocked', 'survived', 'hits', 'shots', 'playerWins']))
    .where('mode', '=', mode)
    .where('day', '>=', since)
    .where('day', '<', until)
    .groupBy(['tank_id', 'cohort'])
    .execute();
