import type { WeeklyChallengeProgress } from '../../../../generated';
import type { ChallengeDefinition } from '../lib/challenges/challenges.types';

export type ToWeeklyChallengeViewInput = {
  definition: ChallengeDefinition;
  progress: readonly WeeklyChallengeProgress[];
};
