import type { CompetitionScoring, CompetitionsQuery, CreateCompetition, JoinCompetitionInput } from '@otmetki/schemas';

import type { Competition, CompetitionSource } from '../../../generated';
import type { CatalogEntry } from '../reference';
import type { ParticipantScore } from './lib/competition-scoring/competition-scoring.types';
import type { CompetitionWithSummary } from './selects/competition-summary.types';

export type CompetitionListInput = {
  query: CompetitionsQuery;
  viewerUserId: string | null;
};

export type CompetitionGetInput = {
  slug: string;
  viewerUserId: string | null;
  code: string | undefined;
};

export type CompetitionCreateInput = CreateCompetition & {
  userId: string;
};

export type CompetitionJoinInput = JoinCompetitionInput & {
  id: string;
  userId: string;
};

export type CompetitionOwnedInput = {
  id: string;
  userId: string;
};

export type ScoreCompetitionInput = {
  competition: Competition;
  now: Date;
};

export type ScoreEntryInput = {
  competition: Competition;
  catalog: ReadonlyMap<number, CatalogEntry> | null;
  accountId: bigint;
  joinedAt: Date;
};

export type CanViewInput = {
  competition: Competition;
  viewerUserId: string | null;
  code: string | undefined;
};

export type TeamLookupInput = {
  competitionId: string;
  teamId: string;
};

export type NewTeamInput = {
  competitionId: string;
  name: string;
};

export type ToViewInput = {
  row: CompetitionWithSummary;
  viewerUserId: string | null;
};

export type EntryScore = ParticipantScore & {
  source: CompetitionSource;
};

export type ModBattlesInput = {
  competition: Competition;
  accountId: bigint;
  from: Date;
  limit: number;
};

export type SnapshotScoreInput = ModBattlesInput & {
  scoring: CompetitionScoring;
};
