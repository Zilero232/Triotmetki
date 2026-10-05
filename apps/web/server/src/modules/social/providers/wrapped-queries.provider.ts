import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { WRAPPED_QUERIES } from '../queries/wrapped.queries';

export const wrappedQueriesProvider = {
  provide: SOCIAL_QUERY_TOKENS.wrapped,
  useValue: WRAPPED_QUERIES
};
