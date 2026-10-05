import { SERVER_AGGREGATE_TOKENS } from '../config/tokens.constants';
import { dailyStats, serverPlayers } from '../queries/server-stats.queries';
import { demoteIdle, promotePinned } from '../queries/tracking-tiers.queries';

export const serverQueries = { serverPlayers, dailyStats, promotePinned, demoteIdle };

export const serverQueriesProvider = {
  provide: SERVER_AGGREGATE_TOKENS.queries,
  useValue: serverQueries
};
