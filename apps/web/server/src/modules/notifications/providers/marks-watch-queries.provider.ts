import { NOTIFICATION_TOKENS } from '../config/tokens.constants';
import { MARKS_WATCH_QUERIES } from '../queries/marks-watch.queries';

export const marksWatchQueriesProvider = {
  provide: NOTIFICATION_TOKENS.marksWatchQueries,
  useValue: MARKS_WATCH_QUERIES
};
