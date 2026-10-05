import { PLAYER_QUERIES } from '../config/queries.constants';
import { activityDays, tankDeltaBuckets } from '../queries/player-history.queries';
import { combinedDamage } from '../queries/player-marks.queries';
import { playtimeFromBattles, playtimeFromDeltas } from '../queries/playtime.queries';

export const playerQueries = { activityDays, combinedDamage, playtimeFromBattles, playtimeFromDeltas, tankDeltaBuckets };

export const playerQueriesProvider = { provide: PLAYER_QUERIES, useValue: playerQueries };
