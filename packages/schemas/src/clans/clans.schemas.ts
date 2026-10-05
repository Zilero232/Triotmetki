import { z } from 'zod';

import { accountIdSchema, clanIdSchema, countSchema, isoDateTimeSchema, percentSchema } from '../common/primitives/primitives.schemas';
import { paginatedSchema, paginationQuerySchema, sortQuery } from '../common/query/query.schemas';
import { ratingValueSchema } from '../common/rating/rating.schemas';
import { CLAN_LIST } from './clans.constants';

export const clanRoleSchema = z.enum([
  'commander',
  'executive_officer',
  'personnel_officer',
  'combat_officer',
  'intelligence_officer',
  'quartermaster',
  'recruitment_officer',
  'junior_officer',
  'private',
  'recruit',
  'reservist'
]);

export const clanSummarySchema = z.object({
  clanId: clanIdSchema,
  tag: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  motto: z.string().nullable(),
  emblem: z.url().nullable(),
  membersCount: countSchema,
  createdAt: isoDateTimeSchema.nullable(),
  isDisbanded: z.boolean()
});

export const clanMemberSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string(),
  role: clanRoleSchema,
  joinedAt: isoDateTimeSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable(),
  inactiveDays: countSchema.nullable(),
  battles: countSchema.nullable(),
  winRate: percentSchema.nullable(),
  wn8: ratingValueSchema,
  recentWn8: ratingValueSchema
});

export const clanMemberEventSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  type: z.enum(['joined', 'left', 'kicked', 'role_changed']),
  oldRole: clanRoleSchema.nullable(),
  newRole: clanRoleSchema.nullable(),
  occurredAt: isoDateTimeSchema
});

const clanStatsSchema = z.object({
  avgWinRate: percentSchema.nullable(),
  avgWn8: ratingValueSchema,
  avgBattlesPerDay: z.number().nonnegative().nullable(),
  activeMembers7d: countSchema.nullable(),
  eloRating10: z.number().int().nullable(),
  strongholdLevel: z.number().int().nullable(),
  provincesCount: countSchema
});

export const clanPageSchema = z.object({
  clan: clanSummarySchema,
  stats: clanStatsSchema,
  members: z.array(clanMemberSchema),
  recentEvents: z.array(clanMemberEventSchema),
  updatedAt: isoDateTimeSchema
});

export const clanMembersSchema = z.array(clanMemberSchema);

export const clanEventsPageSchema = paginatedSchema(clanMemberEventSchema);

export const clanListSortFieldSchema = z.enum(['members', 'wn8', 'winRate', 'eloRating10', 'strongholdLevel', 'activeMembers']);

export const clanListQuerySchema = z.object({
  ...sortQuery(clanListSortFieldSchema).shape,
  ...paginationQuerySchema.shape,
  search: z.string().trim().min(CLAN_LIST.minSearchLength).max(CLAN_LIST.maxSearchLength).optional().describe('Matches the tag or the name'),
  minMembers: z.coerce.number().int().nonnegative().optional(),
  minWn8: z.coerce.number().nonnegative().optional(),
  minWinRate: z.coerce.number().min(0).max(100).optional(),
  minStrongholdLevel: z.coerce.number().int().nonnegative().optional()
});

export const clanListItemSchema = z.object({
  clan: clanSummarySchema,
  avgWn8: ratingValueSchema,
  avgWinRate: percentSchema.nullable(),
  activeMembers7d: countSchema.nullable(),
  eloRating10: z.number().int().nullable(),
  strongholdLevel: z.number().int().nullable()
});

export const clanListPageSchema = paginatedSchema(clanListItemSchema);

export const strongholdBuildingSchema = z.object({
  type: z.string(),
  title: z.string().nullable(),
  level: z.number().int().nonnegative().nullable(),
  position: z.number().int().nullable(),
  direction: z.string().nullable(),
  arenaId: z.string().nullable(),
  reserve: z.string().nullable()
});

export const strongholdReserveSchema = z.object({
  type: z.string(),
  title: z.string().nullable(),
  level: z.number().int().nonnegative().nullable(),
  status: z.string().nullable(),
  count: countSchema.nullable(),
  bonusType: z.string().nullable(),
  activatedAt: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema.nullable()
});

export const strongholdBattlesSchema = z.object({
  tier: z.number().int().positive(),
  battles: countSchema,
  wins: countSchema,
  winRate: percentSchema.nullable()
});

export const clanStrongholdSchema = z.object({
  clanId: clanIdSchema,
  level: z.number().int().nonnegative().nullable(),
  commandCenterArenaId: z.string().nullable(),
  totalResources: countSchema.nullable(),
  buildingSlots: countSchema.nullable(),
  buildings: z.array(strongholdBuildingSchema),
  reserves: z
    .array(strongholdReserveSchema)
    .describe('Empty unless a clan officer shared the reserves; Lesta serves them only with an officer token'),
  skirmishes: z.array(strongholdBattlesSchema),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  globalMap: z.object({
    provincesCount: countSchema,
    eloRating6: z.number().int().nullable(),
    eloRating8: z.number().int().nullable(),
    eloRating10: z.number().int().nullable(),
    provinces: z.array(z.object({ provinceId: z.string(), name: z.string(), arenaId: z.string().nullable(), dailyRevenue: countSchema.nullable() }))
  }),
  updatedAt: isoDateTimeSchema.nullable()
});
