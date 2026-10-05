import type { z } from 'zod';

import type { TournamentStatus } from '../../../generated';
import type { PrismaExecutor } from '../../core';
import type { NamesById, Owned, OwnedById } from '../community-core';
import type {
  createTournamentSchema,
  registerTournamentSchema,
  reportMatchSchema,
  tournamentPageSchema,
  tournamentSchema,
  tournamentsQuerySchema,
  withdrawTournamentSchema
} from './dto/tournaments.schemas';
import type { TournamentWithParticipants } from './selects/tournament.types';

export type TournamentView = z.infer<typeof tournamentSchema>;
export type TournamentsQuery = z.output<typeof tournamentsQuerySchema>;
export type TournamentPage = z.infer<typeof tournamentPageSchema>;
export type CreateTournamentRequest = z.output<typeof createTournamentSchema> & Owned;
export type RegisterTournamentRequest = z.output<typeof registerTournamentSchema> & OwnedById;
export type WithdrawTournamentRequest = z.output<typeof withdrawTournamentSchema> & OwnedById;
export type ReportMatchRequest = z.output<typeof reportMatchSchema> & OwnedById;

export type TournamentMove = OwnedById & {
  from: TournamentStatus;
  to: TournamentStatus;
};

export type OrganizedInput = OwnedById & {
  db?: PrismaExecutor;
};

export type TournamentViewWith = {
  tournament: TournamentWithParticipants;
  nicknames: NamesById;
};

export type ViewTournamentInput = {
  slug: string;
  viewerUserId: string | null;
};
