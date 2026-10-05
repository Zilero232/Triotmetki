import { z } from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { booleanParam, paginatedSchema, paginationQuerySchema } from '../common/query/query.schemas';
import { tierSchema } from '../vehicles/vehicles.schemas';
import { COMPETITION, COMPETITION_MODES, COMPETITION_SOURCES, COMPETITION_STATUSES, COMPETITION_VISIBILITIES } from './competitions.constants';

const DAY_MS = 86_400_000;

const weight = z.number().min(0).max(COMPETITION.weightMax);

export const competitionModeSchema = z.enum(COMPETITION_MODES);

export const competitionStatusSchema = z.enum(COMPETITION_STATUSES);

export const competitionSourceSchema = z.enum(COMPETITION_SOURCES).describe('Where the participant own results came from');

export const competitionVisibilitySchema = z
  .enum(COMPETITION_VISIBILITIES)
  .describe('private competitions are listed only to their members and need Plus to create');

export const competitionScoringSchema = z
  .object({
    damage: weight,
    assist: weight,
    blocked: weight,
    frags: weight,
    spotted: weight,
    xp: weight,
    win: weight,
    survive: weight
  })
  .describe('Points per unit of each metric of a participant own battle: per damage point, per frag, per win and so on');

export const competitionMemberSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  battles: countSchema,
  score: z.number().nonnegative(),
  source: competitionSourceSchema
});

export const competitionTeamSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  rank: z.number().int().positive(),
  score: z.number().nonnegative(),
  battles: countSchema,
  members: z.array(competitionMemberSchema)
});

export const competitionSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: competitionVisibilitySchema,
  mode: competitionModeSchema,
  battlesPerPlayer: z.number().int().positive(),
  minTier: tierSchema.nullable(),
  status: competitionStatusSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  teams: countSchema,
  participants: countSchema,
  organizer: z.string().nullable(),
  leader: z.string().nullable().describe('Name of the team in first place')
});

export const competitionSchema = competitionSummarySchema.extend({
  scoring: competitionScoringSchema,
  maxTeamSize: z.number().int().positive(),
  isOwner: z.boolean(),
  myTeamId: uuidSchema.nullable(),
  inviteCode: z.string().nullable().describe('Only for the organizer of a private competition'),
  scoredAt: isoDateTimeSchema.nullable(),
  standings: z.array(competitionTeamSchema)
});

export const competitionsQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  status: competitionStatusSchema.optional(),
  mine: booleanParam.optional()
});

export const competitionPageSchema = paginatedSchema(competitionSummarySchema);

export const competitionSlugParamsSchema = z.object({ slug: z.string().min(1).max(120) });

export const competitionIdParamsSchema = z.object({ id: uuidSchema });

export const competitionAccessQuerySchema = z.object({
  code: z.string().trim().max(32).optional().describe('Invite code of a private competition')
});

export const createCompetitionSchema = z
  .object({
    title: z.string().trim().min(3).max(COMPETITION.titleMax),
    description: z.string().trim().max(COMPETITION.descriptionMax).optional(),
    visibility: competitionVisibilitySchema.default('public'),
    mode: competitionModeSchema.default('random'),
    battlesPerPlayer: z.number().int().min(COMPETITION.battles.min).max(COMPETITION.battles.max).default(COMPETITION.battles.default),
    minTier: tierSchema.optional(),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    scoring: competitionScoringSchema.default(COMPETITION.defaultScoring)
  })
  .refine(({ startsAt, endsAt }) => new Date(endsAt) > new Date(startsAt), { message: 'The competition must end after it starts', path: ['endsAt'] })
  .refine(({ startsAt, endsAt }) => new Date(endsAt).getTime() - new Date(startsAt).getTime() <= COMPETITION.maxDurationDays * DAY_MS, {
    message: 'The competition is too long',
    path: ['endsAt']
  });

export const joinCompetitionSchema = z
  .object({
    accountId: accountIdSchema,
    teamId: uuidSchema.optional(),
    teamName: z.string().trim().min(2).max(COMPETITION.teamNameMax).optional(),
    inviteCode: z.string().trim().max(32).optional()
  })
  .refine(({ teamId, teamName }) => (teamId === undefined) !== (teamName === undefined), {
    message: 'Join an existing team or name a new one',
    path: ['teamId']
  });
