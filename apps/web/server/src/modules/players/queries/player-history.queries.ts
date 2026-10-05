import type { AccountDeltasInput, TankDeltaBucketsInput } from './player-history.types';

import { moscowBucket, moscowDayText, statSums } from '../../../core';
import { PLAYER_STATS } from '../config/player-stats.constants';

export const accountDeltas = ({ db, accountId, from }: AccountDeltasInput) =>
  db
    .selectFrom('tank_battle_delta')
    .where('account_id', '=', accountId)
    .where('mode', '=', PLAYER_STATS.snapshotMode)
    .where('captured_at', '>=', from);

export const tankDeltaTotals = (input: AccountDeltasInput) =>
  accountDeltas(input).select('tank_id').select(statSums(PLAYER_STATS.deltaSums)).groupBy('tank_id').execute();

export const tankDeltaBuckets = ({ granularity, to, tankId, ...window }: TankDeltaBucketsInput) =>
  accountDeltas(window)
    .$call((query) => (to === undefined ? query : query.where('captured_at', '<', to)))
    .$call((query) => (tankId === undefined ? query : query.where('tank_id', '=', tankId)))
    .select(moscowBucket({ granularity, column: 'captured_at' }).as('bucket'))
    .select('tank_id')
    .select(statSums(PLAYER_STATS.deltaSums))
    .groupBy(['bucket', 'tank_id'])
    .execute();

export const activityDays = (input: AccountDeltasInput) =>
  accountDeltas(input)
    .select(moscowDayText('captured_at').as('day'))
    .select(statSums(['battles', 'wins']))
    .groupBy('day')
    .orderBy('day')
    .execute();
