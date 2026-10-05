import type { PLAYER_RATINGS_AGGREGATE } from '../config/player-ratings.constants';

export type RatingMode = (typeof PLAYER_RATINGS_AGGREGATE.ratingModes)[number];

export type TankHistoryInput = {
  accountId: number;
  mode: RatingMode;
  cutoff: Date;
};
