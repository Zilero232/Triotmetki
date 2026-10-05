import { TOURNAMENT_QUERY_TOKENS } from '../config/queries.constants';
import { TOURNAMENT_SEEDS_QUERIES } from '../queries/tournament-seeds.queries';

export const tournamentSeedsQueriesProvider = {
  provide: TOURNAMENT_QUERY_TOKENS.seeds,
  useValue: TOURNAMENT_SEEDS_QUERIES
};
