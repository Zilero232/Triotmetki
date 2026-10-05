import type { Database } from '../../../core';
import type { MARKS_WATCH_QUERIES } from './marks-watch.queries';

export type PreviousBattleMarksInput = {
  db: Database;
  battleIds: readonly string[];
  since: Date;
};

export type MarksWatchQueries = typeof MARKS_WATCH_QUERIES;
