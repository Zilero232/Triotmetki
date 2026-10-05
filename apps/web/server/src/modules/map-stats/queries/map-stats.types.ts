import type { CompetitionMode } from '@otmetki/schemas';

import type { Database } from '../../../core';
import type { StatsWindow } from '../lib/stats-window/stats-window.types';
import type { mapStatsQueries, queueTimes } from './map-stats.queries';

export type BonusMode = {
  battleType: string;
  mode: CompetitionMode;
};

export type MapStatsWindowInput = StatsWindow & {
  db: Database;
};

export type QueueTimeRow = Awaited<ReturnType<typeof queueTimes>>[number];

export type MapStatsQueries = typeof mapStatsQueries;
