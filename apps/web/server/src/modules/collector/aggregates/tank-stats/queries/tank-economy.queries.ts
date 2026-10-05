import { MOD_AGGREGATES } from '@otmetki/schemas';

import type { EconomyAccount } from '../../../../../../generated/kysely/enums';
import type { TankEconomyRowsInput } from './tank-stats.types';

import { jsonbPathText, percentile, replayWithoutModBattle } from '../../../../../core';
import { TANK_ECONOMY_AGGREGATE } from '../config/tank-stats.constants';

export const tankEconomyRows = ({ db, since }: TankEconomyRowsInput) => {
  const { median, minBattles, randomBattleType, replayCreditsPath } = TANK_ECONOMY_AGGREGATE;

  return db
    .with('mod_rows', (query) =>
      query
        .selectFrom('battle')
        .select([
          'tank_id',
          'account_id',
          'credits',
          'credits_gross',
          'repair_cost',
          'ammo_cost',
          'consumables_cost',
          'xp',
          'free_xp',
          'is_premium_account'
        ])
        .where('battle_type', '=', randomBattleType)
        .where('started_at', '>=', since)
        .where('credits', 'is not', null)
    )
    .with('replay_rows', (query) =>
      query
        .selectFrom('replay')
        .select((eb) => [
          eb.ref('tank_id').$notNull().as('tank_id'),
          eb.ref('account_id').$notNull().as('account_id'),
          eb.cast<number | null>(eb.cast(jsonbPathText({ column: 'summary', path: replayCreditsPath }), 'float8'), 'integer').as('credits'),
          eb.cast<number | null>(eb.lit(null), 'integer').as('credits_gross'),
          eb.cast<number | null>(eb.lit(null), 'integer').as('repair_cost'),
          eb.cast<number | null>(eb.lit(null), 'integer').as('ammo_cost'),
          eb.cast<number | null>(eb.lit(null), 'integer').as('consumables_cost'),
          eb.ref('xp').$notNull().as('xp'),
          eb.cast<number | null>(eb.lit(null), 'integer').as('free_xp'),
          eb.cast<boolean | null>(eb.lit(null), 'boolean').as('is_premium_account')
        ])
        .where('status', '=', 'parsed')
        .where('battle_type', '=', randomBattleType)
        .where('played_at', '>=', since)
        .where('tank_id', 'is not', null)
        .where('account_id', 'is not', null)
        .where('xp', 'is not', null)
        .where(replayWithoutModBattle)
    )
    .with('all_rows', (query) =>
      query
        .selectFrom('mod_rows')
        .selectAll()
        .unionAll(query.selectFrom('replay_rows').selectAll().where('credits', 'is not', null))
    )
    .with('tagged', (query) =>
      query
        .selectFrom('all_rows')
        .selectAll()
        .select((eb) => eb.cast<EconomyAccount>(eb.val('all'), 'text').as('account'))
        .unionAll(
          query
            .selectFrom('all_rows')
            .selectAll()
            .select((eb) =>
              eb
                .case()
                .when('is_premium_account', '=', true)
                .then(eb.cast<EconomyAccount>(eb.val('premium'), 'text'))
                .else(eb.cast<EconomyAccount>(eb.val('standard'), 'text'))
                .end()
                .as('account')
            )
            .where('is_premium_account', 'is not', null)
        )
    )
    .with('costed', (query) =>
      query
        .selectFrom('tagged')
        .selectAll()
        .select((eb) => eb(eb(eb('credits', '-', eb.ref('repair_cost')), '-', eb.ref('ammo_cost')), '-', eb.ref('consumables_cost')).as('net'))
    )
    .selectFrom('costed')
    .select((eb) => [
      'tank_id',
      'account',
      eb.fn.countAll<number>().as('battles'),
      eb.fn.count<number>('account_id').distinct().as('players'),
      eb.fn
        .countAll<number>()
        .filterWhere((filter) =>
          filter.and([filter('repair_cost', 'is not', null), filter('ammo_cost', 'is not', null), filter('consumables_cost', 'is not', null)])
        )
        .as('cost_battles'),
      percentile({ fraction: median, column: 'credits' }).$castTo<number | null>().as('credits'),
      percentile({ fraction: median, column: 'credits_gross' }).$castTo<number | null>().as('credits_base'),
      percentile({ fraction: median, column: 'repair_cost' }).$castTo<number | null>().as('repair'),
      percentile({ fraction: median, column: 'ammo_cost' }).$castTo<number | null>().as('ammo'),
      percentile({ fraction: median, column: 'consumables_cost' }).$castTo<number | null>().as('consumables'),
      percentile({ fraction: median, column: 'net' }).$castTo<number | null>().as('net'),
      percentile({ fraction: median, column: 'xp' }).$castTo<number | null>().as('xp'),
      percentile({ fraction: median, column: 'free_xp' }).$castTo<number | null>().as('free_xp')
    ])
    .groupBy(['tank_id', 'account'])
    .having((eb) => eb.fn.countAll(), '>=', minBattles)
    .having((eb) => eb.fn.count('account_id').distinct(), '>=', MOD_AGGREGATES.minAccounts)
    .execute();
};
