import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { WEEKLY_CHALLENGE_QUERIES } from '../queries/weekly-challenge.queries';

export const weeklyChallengeQueriesProvider = {
  provide: SOCIAL_QUERY_TOKENS.weeklyChallenge,
  useValue: WEEKLY_CHALLENGE_QUERIES
};
