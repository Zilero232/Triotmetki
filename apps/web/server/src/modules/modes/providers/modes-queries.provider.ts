import { MODES_QUERIES } from '../config/queries.constants';
import { myModeBattles } from '../queries/my-mode-stats.queries';

export const modesQueries = { myModeBattles };

export const modesQueriesProvider = { provide: MODES_QUERIES, useValue: modesQueries };
