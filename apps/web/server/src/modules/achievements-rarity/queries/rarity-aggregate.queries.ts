import { sql } from 'kysely';

import type { RollupValues, TankOwnersInput, UpdateRollupsInput } from './rarity-aggregate.types';

import { ACHIEVEMENTS_AGGREGATE } from '../config/aggregate.constants';

export const tankOwners = ({ db }: TankOwnersInput) =>
  db
    .with('owned', (cte) =>
      cte
        .selectFrom('player_tank')
        .innerJoin('player', 'player.account_id', 'player_tank.account_id')
        .select(['player_tank.tank_id', 'player_tank.account_id'])
        .where('player.tracking_tier', 'in', ACHIEVEMENTS_AGGREGATE.tankTiers)
        .where((eb) => eb.or([eb('player_tank.battles', '>', 0), eb('player_tank.in_garage', 'is', true)]))
    )
    .with('sample', (cte) => cte.selectFrom('owned').select((eb) => eb.fn.count<number>('owned.account_id').distinct().as('players')))
    .selectFrom('owned')
    .innerJoin('sample', (join) => join.onTrue())
    .select((eb) => ['owned.tank_id as tankId', eb.fn.countAll<number>().as('owners'), 'sample.players as sample'])
    .groupBy(['owned.tank_id', 'sample.players'])
    .execute();

const rollupValues = ({ rows }: Pick<UpdateRollupsInput, 'rows'>) =>
  sql<RollupValues>`unnest(
    ${rows.map((row) => row.accountId)}::bigint[],
    ${rows.map((row) => row.held)}::int[],
    ${rows.map((row) => row.points)}::int[],
    ${rows.map((row) => row.completion)}::float8[]
  )`.as<'rollup'>(sql`rollup(account_id, held, points, completion)`);

export const updateRollups = ({ db, rows, computedAt }: UpdateRollupsInput) =>
  db
    .updateTable('account_achievements')
    .from(rollupValues({ rows }))
    .set((eb) => ({
      held: eb.ref('rollup.held'),
      points: eb.ref('rollup.points'),
      completion: eb.ref('rollup.completion'),
      computed_at: computedAt
    }))
    .whereRef('account_achievements.account_id', '=', 'rollup.account_id')
    .execute();

export const rarityAggregateQueries = { tankOwners, updateRollups } as const;
