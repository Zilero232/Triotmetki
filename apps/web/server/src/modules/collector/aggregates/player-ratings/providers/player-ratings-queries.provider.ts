import { PLAYER_RATINGS_TOKENS } from '../config/tokens.constants';
import { accountSnapshotWindow, replaceAccountRatings, replaceAccountTankRatings, tankBoundary } from '../queries/account-ratings.queries';

export const playerRatingsQueries = { accountSnapshotWindow, tankBoundary, replaceAccountRatings, replaceAccountTankRatings };

export const playerRatingsQueriesProvider = {
  provide: PLAYER_RATINGS_TOKENS.queries,
  useValue: playerRatingsQueries
};
