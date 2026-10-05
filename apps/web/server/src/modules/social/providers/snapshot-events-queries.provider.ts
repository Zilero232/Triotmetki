import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { SNAPSHOT_EVENTS_QUERIES } from '../queries/snapshot-events.queries';

export const snapshotEventsQueriesProvider = {
  provide: SOCIAL_QUERY_TOKENS.snapshotEvents,
  useValue: SNAPSHOT_EVENTS_QUERIES
};
