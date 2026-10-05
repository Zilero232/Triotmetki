import type { BuildRanksInput } from './meta.types';

import { BUILD_USAGE_AGGREGATE } from '../lib/build-usage/build-usage.constants';

export const buildRanks = ({ db, since, battleTypes }: BuildRanksInput) =>
  db
    .with('pairs', (query) =>
      query
        .selectFrom('battle')
        .select(['tank_id', 'account_id'])
        .distinct()
        .where('started_at', '>=', since)
        .where('battle_type', 'in', battleTypes)
        .where('loadout', 'is not', null)
    )
    .selectFrom((query) =>
      query
        .selectFrom('account_tank_rating')
        .select((eb) => [
          'tank_id',
          'account_id',
          eb.fn
            .agg<number>('percent_rank')
            .over((over) => over.partitionBy('tank_id').orderBy('wn8', 'desc'))
            .as('rank')
        ])
        .where('tank_id', 'in', (eb) => eb.selectFrom('pairs').select('tank_id'))
        .where('period', '=', 'overall')
        .where('wn8', 'is not', null)
        .where('battles', '>=', BUILD_USAGE_AGGREGATE.cohortMinBattles)
        .as('ranked')
    )
    .innerJoin('pairs', (join) => join.onRef('pairs.tank_id', '=', 'ranked.tank_id').onRef('pairs.account_id', '=', 'ranked.account_id'))
    .select(['ranked.tank_id', 'ranked.account_id', 'ranked.rank'])
    .execute();
