import type { WEEKLY_CHALLENGES } from '../../config/challenges.constants';

export type ChallengeDefinition = (typeof WEEKLY_CHALLENGES)[number];

export type WeekStats = {
  battles: number;
  wins: number;
  spotted: number;
  marks: number;
  bigDamage: readonly { damage: number; vehicleType: string | null }[];
};

export type ChallengeProgressInput = {
  definition: ChallengeDefinition;
  stats: WeekStats;
};
