import type { Database } from '../../../core';
import type { achievementsSyncQueries } from './achievements-sync.queries';

export type FetchCandidatesInput = {
  db: Database;
  staleBefore: Date;
  limit: number;
};

export type AchievementsSyncQueries = typeof achievementsSyncQueries;

export type FetchCandidateRow = Awaited<ReturnType<AchievementsSyncQueries['fetchCandidates']>>[number];
