import { match } from 'ts-pattern';

import type { ChallengeDefinition, ChallengeProgressInput } from './challenges.types';

import { CHALLENGE_BADGES, WEEKLY_CHALLENGES } from '../../config/challenges.constants';

export const badgeCodeOf = (definition: Pick<ChallengeDefinition, 'code'>): string => `${CHALLENGE_BADGES.prefix}${definition.code}`;

export const challengeOfBadge = (code: string): ChallengeDefinition | null =>
  WEEKLY_CHALLENGES.find((definition) => badgeCodeOf(definition) === code) ?? null;

export const challengeProgress = ({ definition, stats }: ChallengeProgressInput): number =>
  match(definition)
    .with({ metric: 'battles' }, () => stats.battles)
    .with({ metric: 'wins' }, () => stats.wins)
    .with({ metric: 'spotted' }, () => stats.spotted)
    .with({ metric: 'marks' }, () => stats.marks)
    .with(
      { metric: 'bigDamageBattles' },
      (big) =>
        stats.bigDamage.filter((battle) => battle.damage >= big.threshold && (!('vehicleType' in big) || battle.vehicleType === big.vehicleType))
          .length
    )
    .exhaustive();
