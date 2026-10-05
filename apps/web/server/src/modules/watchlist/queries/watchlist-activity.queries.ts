import type { MarksGainedInput, SessionTotalsInput } from './watchlist-activity.types';

import { STATS_MODE_SQL } from '../../../common/lib';

const markedSnapshots = ({ db, accountIds, lookback }: MarksGainedInput) =>
  db
    .selectFrom('tank_snapshot')
    .where('account_id', 'in', accountIds)
    .where('mode', '=', STATS_MODE_SQL.random)
    .where('marks_on_gun', 'is not', null)
    .where('captured_at', '>=', lookback);

export const marksGained = (input: MarksGainedInput) =>
  input.db
    .with('before', () =>
      markedSnapshots(input)
        .where('captured_at', '<', input.since)
        .distinctOn(['account_id', 'tank_id'])
        .select(['account_id', 'tank_id', 'marks_on_gun as marks'])
        .orderBy('account_id')
        .orderBy('tank_id')
        .orderBy('captured_at', 'desc')
    )
    .with('after', () =>
      markedSnapshots(input)
        .where('captured_at', '>=', input.since)
        .select((eb) => ['account_id', 'tank_id', eb.fn.max('marks_on_gun').as('marks')])
        .groupBy(['account_id', 'tank_id'])
    )
    .selectFrom('before')
    .innerJoin('after', (join) => join.onRef('after.account_id', '=', 'before.account_id').onRef('after.tank_id', '=', 'before.tank_id'))
    .whereRef('after.marks', '>', 'before.marks')
    .select((eb) => ['before.account_id', eb.fn.countAll<number>().as('marks')])
    .groupBy('before.account_id')
    .execute();

export const sessionTotals = ({ db, accountIds, since }: SessionTotalsInput) =>
  db
    .selectFrom('play_session')
    .select((eb) => [
      'account_id',
      eb.fn.sum<number>('battles').as('battles'),
      eb.fn.sum<number>('wins').as('wins'),
      eb.fn.sum<number>('damage_dealt').as('damage'),
      eb.fn.max('last_activity_at').as('last_at')
    ])
    .where('account_id', 'in', accountIds)
    .where('source', '=', 'api')
    .where('last_activity_at', '>=', since)
    .where('battles', '>', 0)
    .groupBy('account_id')
    .execute();
