import { MOD_AGGREGATES, MODE_META } from '@otmetki/schemas';

import type { ModeMetaRowsInput } from './meta.types';

import { replayWithoutModBattle } from '../../../../../core';
import { MODE_META_AGGREGATE } from '../config/meta.constants';

export const modeMetaRows = ({ db, battleTypes, since }: ModeMetaRowsInput) =>
  db
    .with('mod_rows', (query) =>
      query
        .selectFrom('battle')
        .select((eb) => [
          'tank_id',
          'account_id',
          eb.cast<string>('result', 'text').as('result'),
          'damage_dealt',
          'xp',
          'frags',
          eb.ref('survived').$castTo<boolean | null>().as('survived'),
          eb.lit(true).$castTo<boolean>().as('is_mod')
        ])
        .where('battle_type', 'in', battleTypes)
        .where('started_at', '>=', since)
    )
    .with('replay_rows', (query) =>
      query
        .selectFrom('replay')
        .select((eb) => [
          eb.ref('tank_id').$notNull().as('tank_id'),
          eb.ref('account_id').$notNull().as('account_id'),
          eb.cast<string>('result', 'text').as('result'),
          eb.ref('damage_dealt').$notNull().as('damage_dealt'),
          eb.ref('xp').$castTo<number>().as('xp'),
          eb.ref('frags').$castTo<number>().as('frags'),
          eb.cast<boolean | null>(eb.lit(null), 'boolean').as('survived'),
          eb.lit(false).$castTo<boolean>().as('is_mod')
        ])
        .where('status', '=', 'parsed')
        .where('battle_type', 'in', battleTypes)
        .where('played_at', '>=', since)
        .where('tank_id', 'is not', null)
        .where('account_id', 'is not', null)
        .where('result', 'is not', null)
        .where('damage_dealt', 'is not', null)
        .where(replayWithoutModBattle)
    )
    .with('all_rows', (query) => query.selectFrom('mod_rows').selectAll().unionAll(query.selectFrom('replay_rows').selectAll()))
    .with('with_total', (query) =>
      query
        .selectFrom('all_rows')
        .selectAll()
        .unionAll(
          query
            .selectFrom('all_rows')
            .select((eb) => [
              eb.lit(MODE_META.totalTankId).as('tank_id'),
              'account_id',
              'result',
              'damage_dealt',
              'xp',
              'frags',
              'survived',
              'is_mod'
            ])
        )
    )
    .selectFrom('with_total')
    .select((eb) => {
      const survived = eb
        .case()
        .when('survived', 'is', null)
        .then(eb.lit(null))
        .when('survived', '=', true)
        .then(eb.cast<number>(eb.lit(1), MODE_META_AGGREGATE.survivalScale))
        .else(eb.cast<number>(eb.lit(0), MODE_META_AGGREGATE.survivalScale))
        .end();

      return [
        'tank_id',
        eb.fn.countAll<number>().as('battles'),
        eb.fn.count<number>('account_id').distinct().as('players'),
        eb.fn.countAll<number>().filterWhere('result', '=', 'win').as('wins'),
        eb.fn.countAll<number>().filterWhere('result', '<>', 'draw').as('decided'),
        eb.fn.avg<number | null>('damage_dealt').as('avg_damage'),
        eb.fn.avg<number | null>('xp').as('avg_xp'),
        eb.fn.avg<number | null>('frags').as('avg_frags'),
        eb(eb.fn.avg<number | null>(survived), '*', eb.lit(100)).as('survival_rate'),
        eb.fn.countAll<number>().filterWhere('is_mod', '=', true).as('mod_battles'),
        eb.fn.countAll<number>().filterWhere('is_mod', '=', false).as('replay_battles')
      ];
    })
    .groupBy('tank_id')
    .having((eb) => eb.fn.countAll(), '>=', MODE_META_AGGREGATE.minBattles)
    .having((eb) => eb.fn.count('account_id').distinct(), '>=', MOD_AGGREGATES.minAccounts)
    .execute();
