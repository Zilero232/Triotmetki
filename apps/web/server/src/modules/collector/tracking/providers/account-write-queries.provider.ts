import { TRACKING_TOKENS } from '../config/tracking.constants';
import { ACCOUNT_WRITE_QUERIES } from '../queries/account-writes.queries';

export const accountWriteQueriesProvider = {
  provide: TRACKING_TOKENS.accountWriteQueries,
  useValue: ACCOUNT_WRITE_QUERIES
};
