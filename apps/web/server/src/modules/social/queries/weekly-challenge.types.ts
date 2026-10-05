import type { Database } from '../../../core';
import type { WEEKLY_CHALLENGE_QUERIES } from './weekly-challenge.queries';

export type ChallengeBattlesInput = {
  db: Database;
  accountIds: readonly number[];
  start: Date;
  end: Date;
};

export type WeeklyChallengeQueries = typeof WEEKLY_CHALLENGE_QUERIES;
