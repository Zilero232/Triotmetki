import { playtimeFromBattles, playtimeFromDeltas, tankDeltaBuckets, tankDeltaTotals } from '../../players';
import { ANALYTICS_QUERIES } from '../config/queries.constants';
import { mapStats, platoonMates, platoonSplit, tankReference } from '../queries/battle-stats.queries';

export const analyticsQueries = {
  mapStats,
  platoonMates,
  platoonSplit,
  playtimeFromBattles,
  playtimeFromDeltas,
  tankDeltaBuckets,
  tankDeltaTotals,
  tankReference
};

export const analyticsQueriesProvider = { provide: ANALYTICS_QUERIES, useValue: analyticsQueries };
