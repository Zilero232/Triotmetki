import type { MyModeBattlesInput } from './my-mode-stats.types';

import { replayWithoutModBattle } from '../../../core';

const ownBattles = ({ db, accountId, battleTypes, since }: MyModeBattlesInput) =>
  db
    .selectFrom('battle')
    .select((eb) => [
      'battle_type',
      'tank_id',
      eb.cast<string>('result', 'text').as('result'),
      'damage_dealt',
      'xp',
      'frags',
      'survived',
      'started_at as played_at'
    ])
    .where('account_id', '=', accountId)
    .where('battle_type', 'in', battleTypes)
    .where('started_at', '>=', since);

const uncoveredReplays = ({ db, accountId, battleTypes, since }: MyModeBattlesInput) =>
  db
    .selectFrom('replay')
    .select((eb) => [
      'battle_type',
      'tank_id',
      eb.cast<string>('result', 'text').as('result'),
      'damage_dealt',
      'xp',
      'frags',
      eb.cast<boolean | null>(eb.lit(null), 'boolean').as('survived'),
      'played_at'
    ])
    .where('account_id', '=', accountId)
    .where('status', '=', 'parsed')
    .where('battle_type', 'in', battleTypes)
    .where('played_at', '>=', since)
    .where('tank_id', 'is not', null)
    .where('result', 'is not', null)
    .where('damage_dealt', 'is not', null)
    .where(replayWithoutModBattle)
    .$narrowType<{ battle_type: string; tank_id: number; damage_dealt: number; played_at: Date }>();

export const myModeBattles = (input: MyModeBattlesInput) =>
  input.db
    .with('own', () => uncoveredReplays(input).unionAll(ownBattles(input)))
    .selectFrom('own')
    .select((eb) => [
      'battle_type',
      'tank_id',
      eb.fn.countAll<number>().as('battles'),
      eb.fn.countAll<number>().filterWhere('result', '=', 'win').as('wins'),
      eb.fn.countAll<number>().filterWhere('result', '<>', 'draw').as('decided'),
      eb.fn.sum<number>('damage_dealt').as('damage'),
      eb.fn.sum<number>(eb.fn.coalesce('xp', eb.lit(0))).as('xp'),
      eb.fn.sum<number>(eb.fn.coalesce('frags', eb.lit(0))).as('frags'),
      eb.fn.countAll<number>().filterWhere('survived', '=', true).as('survived'),
      eb.fn.count<number>('survived').as('survival_known'),
      eb.fn.max('played_at').as('last_battle_at')
    ])
    .groupBy(['battle_type', 'tank_id'])
    .execute();
