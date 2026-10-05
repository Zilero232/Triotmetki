import { MOD_TOKENS } from '../config/tokens.constants';
import { MOD_RATINGS_QUERIES } from '../queries/ratings.queries';

export const modRatingsQueriesProvider = {
  provide: MOD_TOKENS.ratingsQueries,
  useValue: MOD_RATINGS_QUERIES
};
