import { expressionBuilder } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';
import type { OwnBattlesInput, TankReferenceInput } from './battle-stats.types';

import { BATTLE_REVIEW } from '../config';

const battle = expressionBuilder<DB, 'battle'>();

const battleSums = [
  battle.fn.countAll<number>().as('battles'),
  battle.fn.countAll<number>().filterWhere('battle.result', '=', 'win').as('wins'),
  battle.fn.sum<number>('battle.damage_dealt').as('damage'),
  battle.fn.sum<number>('battle.frags').as('frags'),
  battle.fn.sum<number>('battle.spotted').as('spotted'),
  battle.fn.sum<number>('battle.capture_points').as('cap'),
  battle.fn.sum<number>('battle.dropped_capture_points').as('def'),
  battle.fn.countAll<number>().filterWhere('battle.survived', '=', true).as('survived')
];

const largestAssist = battle.fn<number>('greatest', ['damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun']);

const ownBattles = ({ db, accountId, battleType, from }: OwnBattlesInput) =>
  db
    .selectFrom('battle')
    .where('battle.account_id', '=', accountId)
    .where('battle.battle_type', '=', battleType)
    .where('battle.started_at', '>=', from);

export const mapStats = (input: OwnBattlesInput) =>
  ownBattles(input).select(['arena_id', 'tank_id', 'team']).select(battleSums).groupBy(['arena_id', 'tank_id', 'team']).execute();

export const platoonSplit = (input: OwnBattlesInput) =>
  ownBattles(input)
    .where('platoon_size', 'is not', null)
    .select((eb) => eb('platoon_size', '>', 1).as('is_platoon'))
    .select('tank_id')
    .select(battleSums)
    .groupBy(['is_platoon', 'tank_id'])
    .execute();

export const platoonMates = (input: OwnBattlesInput) =>
  ownBattles(input)
    .where('battle.platoon_size', '>', 1)
    .innerJoin('battle as mate', (join) =>
      join
        .onRef('mate.arena_unique_id', '=', 'battle.arena_unique_id')
        .onRef('mate.account_id', '<>', 'battle.account_id')
        .onRef('mate.team', '=', 'battle.team')
        .on('mate.platoon_size', '>', 1)
        .onRef('mate.battle_type', '=', 'battle.battle_type')
        .on('mate.started_at', '>=', input.from)
    )
    .innerJoin('player', (join) => join.onRef('player.account_id', '=', 'mate.account_id').on('player.is_hidden', '=', false))
    .select(['mate.account_id as mate', 'battle.tank_id'])
    .select(battleSums)
    .groupBy(['mate.account_id', 'battle.tank_id'])
    .execute();

export const tankReference = ({ db, accountId, tankId, battleType, excludedBattleId }: TankReferenceInput) =>
  db
    .selectFrom((eb) =>
      eb
        .selectFrom('battle')
        .select(['result', 'damage_dealt', 'spotted', 'frags', 'damage_blocked', largestAssist.as('assisted')])
        .where('account_id', '=', accountId)
        .where('tank_id', '=', tankId)
        .where('id', '<>', excludedBattleId)
        .where('battle_type', '=', battleType)
        .orderBy('started_at', 'desc')
        .limit(BATTLE_REVIEW.referenceBattles)
        .as('recent')
    )
    .select((eb) => [
      eb.fn.countAll<number>().as('battles'),
      eb.fn.countAll<number>().filterWhere('result', '=', 'win').as('wins'),
      eb.fn.coalesce(eb.fn.sum<number>('damage_dealt'), eb.lit(0)).as('damage'),
      eb.fn.coalesce(eb.fn.sum<number>('assisted'), eb.lit(0)).as('assisted'),
      eb.fn.coalesce(eb.fn.sum<number>('spotted'), eb.lit(0)).as('spotted'),
      eb.fn.coalesce(eb.fn.sum<number>('frags'), eb.lit(0)).as('frags'),
      eb.fn.coalesce(eb.fn.sum<number>('damage_blocked'), eb.lit(0)).as('blocked')
    ])
    .executeTakeFirstOrThrow();
