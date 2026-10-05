import { PULSE_QUERY_TOKENS } from '../config/queries.constants';
import { PULSE_QUERIES } from '../queries/pulse.queries';

export const pulseQueriesProvider = {
  provide: PULSE_QUERY_TOKENS.pulse,
  useValue: PULSE_QUERIES
};
