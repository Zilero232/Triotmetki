import type { Expression } from 'kysely';

import type { LearningCurveRowsInput } from './tank-stats.types';

import { widthBucket } from '../../../../../core';
import { LEARNING_CURVE_AGGREGATE } from '../config/tank-stats.constants';

const SERIES_COLUMNS = ['account_id', 'tank_id', 'captured_at', 'battles', 'wins', 'damage_dealt'] as const;

export const learningCurveRows = ({ db, since }: LearningCurveRowsInput) => {
  const { bucketStarts, maxBattleDelta, minBattles } = LEARNING_CURVE_AGGREGATE;

  return db
    .with('windowed', (query) =>
      query.selectFrom('tank_snapshot').select(SERIES_COLUMNS).where('mode', '=', 'random').where('captured_at', '>', since)
    )
    .with('series', (query) =>
      query
        .selectFrom('windowed')
        .selectAll()
        .unionAll(
          query
            .selectFrom(query.selectFrom('windowed').select(['account_id', 'tank_id']).distinct().as('pair'))
            .innerJoinLateral(
              (eb) =>
                eb
                  .selectFrom('tank_snapshot')
                  .select(SERIES_COLUMNS)
                  .whereRef('tank_snapshot.account_id', '=', 'pair.account_id')
                  .whereRef('tank_snapshot.tank_id', '=', 'pair.tank_id')
                  .where('tank_snapshot.mode', '=', 'random')
                  .where('tank_snapshot.captured_at', '<=', since)
                  .orderBy('tank_snapshot.captured_at', 'desc')
                  .limit(1)
                  .as('base'),
              (join) => join.onTrue()
            )
            .selectAll('base')
        )
    )
    .with('deltas', (query) =>
      query.selectFrom('series').select((eb) => {
        const previous = (value: 'battles' | 'wins' | Expression<number>) =>
          eb.fn.agg<number>('lag', [value]).over((over) => over.partitionBy(['account_id', 'tank_id']).orderBy('captured_at'));

        return [
          'tank_id',
          'account_id',
          previous('battles').as('prev_battles'),
          eb('battles', '-', previous('battles')).as('battles_delta'),
          eb('wins', '-', previous('wins')).as('wins_delta'),
          eb(eb.cast<number>('damage_dealt', 'bigint'), '-', previous(eb.cast<number>('damage_dealt', 'bigint'))).as('damage_delta')
        ];
      })
    )
    .with('bucketed', (query) =>
      query
        .selectFrom('deltas')
        .select((eb) => [
          'tank_id',
          'account_id',
          'battles_delta',
          'wins_delta',
          'damage_delta',
          eb(widthBucket({ column: 'prev_battles', thresholds: bucketStarts }), '-', eb.lit(1)).as('bucket')
        ])
        .where('battles_delta', '>', 0)
        .where('battles_delta', '<=', maxBattleDelta)
        .where('wins_delta', '>=', 0)
        .where('damage_delta', '>=', 0)
    )
    .selectFrom('bucketed')
    .select((eb) => [
      'tank_id',
      'bucket',
      eb.fn.sum<number>('battles_delta').as('battles'),
      eb.fn.count<number>('account_id').distinct().as('players'),
      eb.fn.sum<number>('wins_delta').as('wins'),
      eb.fn.sum<number>('damage_delta').as('damage')
    ])
    .groupBy(['tank_id', 'bucket'])
    .having((eb) => eb.fn.sum('battles_delta'), '>=', minBattles)
    .execute();
};
