import type { NotNull } from 'kysely';

import type { MapSamplesInput } from './map-samples.types';

import { replayWithoutModBattle } from '../../../core';

const battleSamples = ({ db, scope, since, battleType }: MapSamplesInput) =>
  db
    .selectFrom('battle')
    .select(['account_id', 'arena_unique_id', 'tank_id', 'arena_id', 'result', 'damage_dealt'])
    .$call((query) => ('tankId' in scope ? query.where('tank_id', '=', scope.tankId) : query.where('arena_id', '=', scope.arenaId)))
    .where('battle_type', '=', battleType)
    .where('started_at', '>=', since);

const replaySamples = ({ db, scope, since, battleType }: MapSamplesInput) =>
  db
    .selectFrom('replay')
    .select(['account_id', 'arena_unique_id', 'tank_id', 'arena_id', 'result', 'damage_dealt'])
    .$call((query) => ('tankId' in scope ? query.where('tank_id', '=', scope.tankId) : query.where('arena_id', '=', scope.arenaId)))
    .where('battle_type', '=', battleType)
    .where('status', '=', 'parsed')
    .where('visibility', '<>', 'private')
    .where('played_at', '>=', since)
    .where('account_id', 'is not', null)
    .where('arena_unique_id', 'is not', null)
    .where('tank_id', 'is not', null)
    .where('arena_id', 'is not', null)
    .where('result', 'is not', null)
    .where('damage_dealt', 'is not', null)
    .where(replayWithoutModBattle)
    .$narrowType<{ account_id: NotNull; arena_unique_id: NotNull; tank_id: NotNull; arena_id: NotNull; result: NotNull; damage_dealt: NotNull }>();

export const mapSamples = (input: MapSamplesInput) =>
  input.db
    .with('samples', () => battleSamples(input).unionAll(replaySamples(input)))
    .with('distinct_samples', (cte) =>
      cte
        .selectFrom('samples')
        .distinctOn(['account_id', 'arena_unique_id'])
        .select((eb) => [
          'tankId' in input.scope ? eb.ref('arena_id').as('key') : eb.cast<string>('tank_id', 'text').as('key'),
          'result',
          'damage_dealt'
        ])
        .orderBy('account_id')
        .orderBy('arena_unique_id')
    )
    .selectFrom('distinct_samples')
    .select((eb) => [
      'key',
      eb.fn.countAll<number>().as('battles'),
      eb.fn.countAll<number>().filterWhere('result', '=', 'win').as('wins'),
      eb.fn.avg<number | null>('damage_dealt').as('avgDamage')
    ])
    .groupBy('key')
    .orderBy('battles', 'desc')
    .orderBy('key')
    .execute();

export const mapSamplesQueries = { mapSamples } as const;
