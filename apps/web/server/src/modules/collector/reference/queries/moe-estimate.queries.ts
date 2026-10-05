import type { MoeEstimatePointsInput } from './moe-estimate.types';

import { percentile, unnestIntegers } from '../../../../core';

export const moeEstimatePoints = ({ db, since, steps, band, battleType }: MoeEstimatePointsInput) =>
  db
    .with('recent', (query) =>
      query
        .selectFrom('battle')
        .select(['tank_id', 'account_id', 'moe_percent', 'moe_moving_avg'])
        .where('battle_type', '=', battleType)
        .where('started_at', '>=', since)
        .where('moe_percent', 'is not', null)
        .where('moe_moving_avg', 'is not', null)
        .where('moe_moving_avg', '>', 0)
    )
    .with('step', (query) => query.selectNoFrom(unnestIntegers(steps).as('value')))
    .with('stepped', (query) =>
      query
        .selectFrom('recent')
        .innerJoin('step', (join) => join.on((eb) => eb(eb.fn('abs', [eb('recent.moe_percent', '-', eb.ref('step.value'))]), '<=', band)))
        .select(['recent.tank_id', 'step.value as percent', 'recent.account_id', 'recent.moe_moving_avg'])
    )
    .with('per_player', (query) =>
      query
        .selectFrom('stepped')
        .select(['tank_id', 'percent', 'account_id', percentile({ fraction: 0.5, column: 'moe_moving_avg' }).as('damage')])
        .groupBy(['tank_id', 'percent', 'account_id'])
    )
    .selectFrom('per_player')
    .select((eb) => [
      'tank_id as tankId',
      'percent',
      percentile({ fraction: 0.5, column: 'damage' }).as('damage'),
      eb.fn.countAll<number>().as('players')
    ])
    .groupBy(['tank_id', 'percent'])
    .orderBy('tank_id')
    .orderBy('percent')
    .execute();
