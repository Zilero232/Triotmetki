import { PURGE_TOKENS } from '../config/purge.constants';
import { PURGE_QUERIES } from '../queries/purge.queries';

export const purgeQueriesProvider = {
  provide: PURGE_TOKENS.purgeQueries,
  useValue: PURGE_QUERIES
};
