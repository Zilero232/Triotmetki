import { groupBy, prop } from 'remeda';

import type { RngDaily } from '../../../../../generated';
import type { RollTally } from '../roll-tally/roll-tally.types';
import type { BattleScope, BattleScopesInput, DailyRowInput } from './rng-daily.types';

import { HONEST_RNG_AGGREGATE } from '../../config/aggregate.constants';

export const battleScopes = ({ tier, shots, accuracy }: BattleScopesInput): BattleScope[] => [
  { scope: HONEST_RNG_AGGREGATE.scopes.server, shots, accuracy },
  ...(tier === undefined ? [] : [{ scope: `${HONEST_RNG_AGGREGATE.scopes.tier}:${tier}`, shots, accuracy }]),
  ...Object.entries(groupBy(shots, prop('shell'))).map(([shell, group]) => ({
    scope: `${HONEST_RNG_AGGREGATE.scopes.shell}:${shell}`,
    shots: group,
    accuracy: null
  }))
];

export const tallyFromDaily = (row: RngDaily): RollTally => ({
  battles: row.battles,
  players: new Set(row.players.map(String)),
  shots: row.shots,
  damage: row.damage,
  nominal: row.nominal,
  within: row.within,
  bucketShots: [...row.bucketShots],
  fired: row.fired,
  hit: row.hit,
  pierced: row.pierced
});

export const dailyFromTally = ({ day, scope, tally }: DailyRowInput): RngDaily => ({
  day,
  scope,
  battles: tally.battles,
  players: [...tally.players].map(BigInt),
  shots: tally.shots,
  damage: tally.damage,
  nominal: tally.nominal,
  within: tally.within,
  bucketShots: tally.bucketShots,
  fired: tally.fired,
  hit: tally.hit,
  pierced: tally.pierced
});
