import type { TankChallenge } from '@otmetki/schemas';

import type { TankChallengeDefinition } from '../../progression.types';
import type { BattleSample } from '../battle-samples/battle-samples.types';

export type WeeklyTankChallengesInput = {
  seed: string;
  tier: number;
  hasModData: boolean;
};

export type ResolvedChallenge = Pick<TankChallenge, 'code' | 'metric' | 'target' | 'threshold'>;

export type ChallengeProgressInput = {
  challenge: Pick<ResolvedChallenge, 'metric' | 'threshold'>;
  samples: readonly BattleSample[];
};

export type ResolveChallengeInput = {
  definition: TankChallengeDefinition;
  tier: number;
};

export type RoundUpInput = {
  value: number;
  step: number;
};
