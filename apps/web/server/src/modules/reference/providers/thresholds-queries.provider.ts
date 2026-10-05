import { REFERENCE_QUERY_TOKENS } from '../config/queries.constants';
import { THRESHOLDS_QUERIES } from '../queries/thresholds.queries';

export const thresholdsQueriesProvider = {
  provide: REFERENCE_QUERY_TOKENS.thresholds,
  useValue: THRESHOLDS_QUERIES
};
