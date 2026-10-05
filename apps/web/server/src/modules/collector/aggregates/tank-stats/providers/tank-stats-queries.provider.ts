import { TANK_STATS_TOKENS } from '../config/tokens.constants';
import { learningCurveRows } from '../queries/learning-curve.queries';
import { tankEconomyRows } from '../queries/tank-economy.queries';
import { tankPercentileRows } from '../queries/tank-percentiles.queries';

export const tankStatsQueries = { tankEconomyRows, learningCurveRows, tankPercentileRows };

export const tankStatsQueriesProvider = {
  provide: TANK_STATS_TOKENS.queries,
  useValue: tankStatsQueries
};
