import { sql } from 'kysely';

import type { MoeCurveInput } from './moe-curve.types';

import { percentile } from '../../../core';

const recentBattles = ({ db, tankId, since, battleType }: MoeCurveInput) =>
  db
    .selectFrom('battle')
    .select(['account_id', 'moe_percent', 'moe_moving_avg'])
    .where('tank_id', '=', tankId)
    .where('battle_type', '=', battleType)
    .where('started_at', '>=', since)
    .where('moe_percent', 'is not', null)
    .where('moe_moving_avg', 'is not', null)
    .where('moe_moving_avg', '>', 0);

export const moeCurve = (input: MoeCurveInput) =>
  input.db
    .with('recent', () => recentBattles(input))
    .with('stepped', (db) =>
      db
        .selectFrom('recent')
        .innerJoin(sql<{ step: number }>`unnest(${input.steps}::int[])`.as('step'), (join) =>
          join.on((eb) => eb(eb.fn('abs', [eb('recent.moe_percent', '-', eb.ref('step.step'))]), '<=', input.band))
        )
        .select(['step.step as percent', 'recent.account_id', 'recent.moe_moving_avg'])
    )
    .with('per_player', (db) =>
      db
        .selectFrom('stepped')
        .select((eb) => [
          'percent',
          'account_id',
          percentile({ fraction: 0.5, column: 'moe_moving_avg' }).as('damage'),
          eb.fn.countAll<number>().as('battles')
        ])
        .groupBy(['percent', 'account_id'])
    )
    .selectFrom('per_player')
    .select((eb) => [
      'percent',
      percentile({ fraction: 0.5, column: 'damage' }).as('damage'),
      eb.fn.countAll<number>().as('players'),
      eb.fn.sum<number>('battles').as('battles')
    ])
    .groupBy('percent')
    .orderBy('percent')
    .execute();

export const moeCurveQueries = { moeCurve } as const;
