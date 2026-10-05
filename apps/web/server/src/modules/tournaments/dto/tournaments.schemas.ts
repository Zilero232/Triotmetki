import { accountIdSchema, isoDateTimeSchema, paginatedSchema, paginationQuerySchema, uuidSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { statRequirementsSchema } from '../../community-core';
import { TOURNAMENT } from '../config/tournaments.constants';

const tournamentStatusSchema = z.enum(['draft', 'registration', 'running', 'finished', 'cancelled']);

export const bracketSchema = z.object({
  size: z.number().int().positive(),
  rounds: z.array(
    z.array(
      z.object({
        round: z.number().int().nonnegative(),
        index: z.number().int().nonnegative(),
        a: z.number().int().nullable(),
        b: z.number().int().nullable(),
        winner: z.number().int().nullable()
      })
    )
  )
});

export const tournamentRulesSchema = z.object({ maxParticipants: z.number().int().positive() });

const tournamentParticipantSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  teamName: z.string().nullable(),
  seed: z.number().int().nullable(),
  verified: z.boolean()
});

export const tournamentSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  requirements: statRequirementsSchema,
  maxParticipants: z.number().int().positive(),
  bracket: bracketSchema.nullable(),
  status: tournamentStatusSchema,
  organizerUserId: uuidSchema,
  registrationEndsAt: isoDateTimeSchema.nullable(),
  startsAt: isoDateTimeSchema,
  participants: z.array(tournamentParticipantSchema)
});

export const tournamentsQuerySchema = paginationQuerySchema.extend({
  status: tournamentStatusSchema.optional()
});

export const tournamentPageSchema = paginatedSchema(tournamentSchema);

export const createTournamentSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().max(8000).optional(),
  requirements: statRequirementsSchema.default({}),
  maxParticipants: z.number().int().min(TOURNAMENT.minParticipants).max(TOURNAMENT.maxParticipants).default(TOURNAMENT.defaultParticipants),
  registrationEndsAt: isoDateTimeSchema.optional(),
  startsAt: isoDateTimeSchema,
  openRegistration: z.boolean().default(false)
});

export const registerTournamentSchema = z.object({
  accountId: accountIdSchema.optional(),
  teamName: z.string().trim().min(2).max(40).optional()
});

export const reportMatchSchema = z.object({
  round: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
  winner: accountIdSchema
});

export const withdrawTournamentSchema = z.object({
  accountId: accountIdSchema.optional()
});
