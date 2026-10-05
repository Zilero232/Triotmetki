import { TANK_CHALLENGES } from '@otmetki/schemas';
import { createHash } from 'node:crypto';
import { sortBy, sumBy } from 'remeda';
import { match } from 'ts-pattern';

import type { TankChallengeDefinition } from '../../progression.types';
import type {
  ChallengeProgressInput,
  ResolveChallengeInput,
  ResolvedChallenge,
  RoundUpInput,
  WeeklyTankChallengesInput
} from './tank-challenges.types';

import { TANK_CHALLENGE_POOL, TANK_CHALLENGE_ROUNDING } from '../../config/tank-challenges.constants';

const roundUp = ({ value, step }: RoundUpInput): number => Math.max(step, Math.ceil(value / step) * step);

const rank = (seed: string): string => createHash('sha1').update(seed).digest('hex');

const resolve = ({ definition, tier }: ResolveChallengeInput): ResolvedChallenge => ({
  code: definition.metric,
  metric: definition.metric,
  target:
    definition.targetPerTier === undefined
      ? (definition.target ?? 0)
      : roundUp({ value: definition.targetPerTier * tier, step: TANK_CHALLENGE_ROUNDING.target }),
  threshold:
    definition.thresholdPerTier === undefined ? null : roundUp({ value: definition.thresholdPerTier * tier, step: TANK_CHALLENGE_ROUNDING.threshold })
});

export const weeklyTankChallenges = ({ seed, tier, hasModData }: WeeklyTankChallengesInput): ResolvedChallenge[] => {
  const pool: readonly TankChallengeDefinition[] = TANK_CHALLENGE_POOL;
  const eligible = pool.filter((definition) => tier >= definition.minTier && (hasModData || !definition.needsMod));

  return sortBy(eligible, (definition) => rank(`${seed}:${definition.metric}`))
    .slice(0, TANK_CHALLENGES.perTank)
    .map((definition) => resolve({ definition, tier }));
};

export const challengeProgress = ({ challenge, samples }: ChallengeProgressInput): number =>
  match(challenge.metric)
    .with('damageBattles', () => samples.filter((sample) => sample.isSingle && sample.damage >= (challenge.threshold ?? 0)).length)
    .with('moeBattles', () => samples.filter((sample) => sample.moeRaised === true).length)
    .with('wins', () => sumBy(samples, (sample) => sample.wins))
    .with('spotted', () => sumBy(samples, (sample) => sample.spotted))
    .with('frags', () => sumBy(samples, (sample) => sample.frags))
    .with('blocked', () => sumBy(samples, (sample) => sample.blocked))
    .with('survived', () => sumBy(samples, (sample) => sample.survived))
    .with('battles', () => sumBy(samples, (sample) => sample.battles))
    .exhaustive();
