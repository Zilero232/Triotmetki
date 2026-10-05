import { TANKS_QUERIES } from '../config/queries.constants';
import { tankTrendRows } from '../queries/tank-trend.queries';

export const tanksQueries = { tankTrendRows };

export const tanksQueriesProvider = { provide: TANKS_QUERIES, useValue: tanksQueries };
