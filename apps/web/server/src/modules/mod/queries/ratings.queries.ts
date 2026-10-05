import type { TankRecordsInput } from './ratings.types';

export const tankRecords = ({ db, accountId, tankIds, battleTypes }: TankRecordsInput) =>
  db
    .selectFrom('battle')
    .select((eb) => [
      'tank_id as tankId',
      eb.fn.max('damage_dealt').as('maxDamage'),
      eb.fn.max(eb('damage_assisted_radio', '+', eb.ref('damage_assisted_track'))).as('maxAssist'),
      eb.fn.max('frags').as('maxFrags'),
      eb.fn.max('xp').as('maxXp')
    ])
    .where('account_id', '=', accountId)
    .where('tank_id', 'in', tankIds)
    .where('battle_type', 'in', battleTypes)
    .groupBy('tank_id')
    .execute();

export const MOD_RATINGS_QUERIES = { tankRecords } as const;
