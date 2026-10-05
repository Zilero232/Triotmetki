import type { Database } from '../../../core';
import type { COMPETITION_BATTLES_QUERIES, competitionBattles } from './competition-battles.queries';

export type CompetitionBattlesInput = {
  db: Database;
  accountId: number;
  battleTypes: readonly string[];
  from: Date;
  until: Date;
  limit: number;
};

export type CompetitionBattleRow = Awaited<ReturnType<typeof competitionBattles>>[number];

export type CompetitionBattlesQueries = typeof COMPETITION_BATTLES_QUERIES;
