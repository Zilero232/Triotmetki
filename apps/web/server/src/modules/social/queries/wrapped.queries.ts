import type { WrappedRangeInput, WrappedTopTanksInput } from './wrapped.types';

import { moscowBucket } from '../../../core';
import { ownerTrustedBattle } from '../../mod';

export const wrappedTopTanks = ({ db, accountId, start, end, limit }: WrappedTopTanksInput) =>
  db
    .selectFrom('tank_snapshot')
    .select((eb) => [
      'tank_id as tankId',
      eb(eb.fn.max('battles'), '-', eb.fn.min('battles')).as('battles'),
      eb(eb.fn.max('damage_dealt'), '-', eb.fn.min('damage_dealt')).as('damage')
    ])
    .where('account_id', '=', accountId)
    .where('mode', '=', 'all')
    .where('captured_at', '>=', start)
    .where('captured_at', '<', end)
    .groupBy('tank_id')
    .having((eb) => eb(eb.fn.max('battles'), '>', eb.fn.min('battles')))
    .orderBy('battles', 'desc')
    .limit(limit)
    .execute();

export const wrappedBusiestMonth = ({ db, accountId, start, end }: WrappedRangeInput) =>
  db
    .selectFrom('play_session')
    .select((eb) => [moscowBucket({ granularity: 'month', column: 'started_at' }).as('monthStart'), eb.fn.sum<number>('battles').as('battles')])
    .where('account_id', '=', accountId)
    .where('started_at', '>=', start)
    .where('started_at', '<', end)
    .groupBy('monthStart')
    .orderBy('battles', 'desc')
    .orderBy('monthStart', 'asc')
    .limit(1)
    .executeTakeFirst();

export const wrappedBestBattle = ({ db, accountId, start, end }: WrappedRangeInput) =>
  db
    .selectFrom('battle')
    .select([
      'battle.id',
      'battle.tank_id as tankId',
      'battle.damage_dealt as damageDealt',
      'battle.frags',
      'battle.started_at as startedAt',
      'battle.arena_unique_id as arenaUniqueId'
    ])
    .where('battle.account_id', '=', accountId)
    .where('battle.started_at', '>=', start)
    .where('battle.started_at', '<', end)
    .where(ownerTrustedBattle)
    .orderBy('battle.damage_dealt', 'desc')
    .orderBy('battle.started_at', 'asc')
    .limit(1)
    .executeTakeFirst();

export const WRAPPED_QUERIES = { wrappedTopTanks, wrappedBusiestMonth, wrappedBestBattle } as const;
