import { REFERENCE_QUERY_TOKENS } from '../config/queries.constants';
import { EXPECTED_VALUES_QUERIES } from '../queries/expected-values.queries';

export const expectedValuesQueriesProvider = {
  provide: REFERENCE_QUERY_TOKENS.expectedValues,
  useValue: EXPECTED_VALUES_QUERIES
};
