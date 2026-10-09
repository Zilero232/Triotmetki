import * as z from 'zod';

import { ratingPeriodSchema } from '../common/period/period.schemas';
import { accountIdSchema, clanIdSchema, countSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { paginationQuerySchema } from '../common/query/query.schemas';
import { ratingKindSchema, ratingTierSchema } from '../common/rating/rating.schemas';
import { tierSchema, vehicleTypeSchema } from '../vehicles/vehicles.schemas';

export const leaderboardScopeSchema = z
  .enum(['players', 'clans', 'risingStars', 'marks', 'streamers'])
  .describe(
    'players: metric, period, minBattles, and tankId/tier/type (then ranked over those tanks); clans: metric only (latest clan snapshot); risingStars: metric, period (overall falls back to 30d), minBattles; marks: count of three-mark tanks, ignores the other filters; streamers: metric, period, minBattles'
  );

export const leaderboardQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  scope: leaderboardScopeSchema.default('players'),
  metric: ratingKindSchema.default('wn8'),
  period: ratingPeriodSchema.default('30d'),
  tankId: tankIdSchema.optional(),
  tier: tierSchema.optional(),
  type: vehicleTypeSchema.optional(),
  minBattles: z.coerce.number().int().nonnegative().optional()
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  accountId: accountIdSchema.nullable(),
  clanId: clanIdSchema.nullable(),
  name: z.string(),
  clanTag: z.string().nullable(),
  color: z.string().nullable().describe('Clan colour (#rrggbb) for clan rows, null for players'),
  value: z.number().describe('The metric value; winRate is a percent'),
  tier: ratingTierSchema.nullable(),
  battles: countSchema,
  delta: z.number().nullable()
});

export const leaderboardSchema = z.object({
  scope: leaderboardScopeSchema,
  metric: ratingKindSchema,
  period: ratingPeriodSchema,
  total: countSchema,
  minBattles: countSchema.nullable().describe('The battles threshold applied, null when the scope has none'),
  entries: z.array(leaderboardEntrySchema)
});
