import type { z } from 'zod';

import type {
  competitionMemberSchema,
  competitionModeSchema,
  competitionPageSchema,
  competitionSchema,
  competitionScoringSchema,
  competitionSourceSchema,
  competitionsQuerySchema,
  competitionStatusSchema,
  competitionSummarySchema,
  competitionTeamSchema,
  createCompetitionSchema,
  joinCompetitionSchema
} from './competitions.schemas';

export type CompetitionMode = z.infer<typeof competitionModeSchema>;
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
export type CompetitionSource = z.infer<typeof competitionSourceSchema>;
export type CompetitionScoring = z.infer<typeof competitionScoringSchema>;
export type CompetitionMember = z.infer<typeof competitionMemberSchema>;
export type CompetitionTeam = z.infer<typeof competitionTeamSchema>;
export type CompetitionSummary = z.infer<typeof competitionSummarySchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type CompetitionsQuery = z.infer<typeof competitionsQuerySchema>;
export type CompetitionPage = z.infer<typeof competitionPageSchema>;
export type CreateCompetitionInput = z.input<typeof createCompetitionSchema>;
export type CreateCompetition = z.output<typeof createCompetitionSchema>;
export type JoinCompetitionInput = z.infer<typeof joinCompetitionSchema>;
