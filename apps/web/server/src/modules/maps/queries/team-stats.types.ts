import type { Database } from '../../../core';
import type { teamStatsQueries } from './team-stats.queries';

export type TeamStatsInput = {
  db: Database;
  arenaId: string;
};

export type TeamStatsQueries = typeof teamStatsQueries;
