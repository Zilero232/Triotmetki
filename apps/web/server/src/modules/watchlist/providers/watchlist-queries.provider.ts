import { WATCHLIST_QUERIES } from '../config/queries.constants';
import { marksGained, sessionTotals } from '../queries/watchlist-activity.queries';

export const watchlistQueries = { marksGained, sessionTotals };

export const watchlistQueriesProvider = { provide: WATCHLIST_QUERIES, useValue: watchlistQueries };
