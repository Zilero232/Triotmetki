import type { CompetitionWithSummary } from '../selects/competition-summary.types';

export type ToCompetitionSummaryInput = {
  row: CompetitionWithSummary;
  now: Date;
};
