import { TRACKING_TOKENS } from '../config/tracking.constants';
import { PLAYER_QUERIES } from '../queries/players.queries';

export const playerQueriesProvider = {
  provide: TRACKING_TOKENS.playerQueries,
  useValue: PLAYER_QUERIES
};
