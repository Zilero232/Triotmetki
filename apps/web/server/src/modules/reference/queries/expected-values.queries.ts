import type { Database } from '../../../core';

export const latestExpectedValues = (db: Database) =>
  db
    .selectFrom('wn8_expected_value')
    .distinctOn('tank_id')
    .select([
      'tank_id as tankId',
      'exp_damage as expDamage',
      'exp_spotted as expSpotted',
      'exp_frags as expFrags',
      'exp_defense as expDefense',
      'exp_win_rate as expWinRate'
    ])
    .orderBy('tank_id')
    .orderBy('date', 'desc')
    .execute();

export const EXPECTED_VALUES_QUERIES = { latestExpectedValues } as const;
