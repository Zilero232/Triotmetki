import { PURGE_TOKENS } from '../config/purge.constants';
import { RETENTION_QUERIES } from '../queries/retention.queries';

export const retentionQueriesProvider = {
  provide: PURGE_TOKENS.retentionQueries,
  useValue: RETENTION_QUERIES
};
