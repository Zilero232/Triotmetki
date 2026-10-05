import { COMPETITION_QUERY_TOKENS } from '../config/queries.constants';
import { COMPETITION_BATTLES_QUERIES } from '../queries/competition-battles.queries';

export const competitionBattlesQueriesProvider = {
  provide: COMPETITION_QUERY_TOKENS.battles,
  useValue: COMPETITION_BATTLES_QUERIES
};
