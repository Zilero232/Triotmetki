import {
  accountIdSchema,
  battleResultSchema,
  countSchema,
  isoDateSchema,
  isoDateTimeSchema,
  listParam,
  nationSchema,
  nicknameSchema,
  paginatedSchema,
  paginationQuerySchema,
  replayMasterySchema,
  replayStatusSchema,
  replaySummarySchema,
  replayTagSchema,
  tankIdSchema,
  tierSchema,
  uuidSchema,
  vehicleTypeSchema,
  visibilitySchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { HEATMAP } from '../config/heatmap.constants';

const replaySortSchema = z.enum(['recent', 'damage', 'xp', 'views']);

const slugPart = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\w-]+$/);

export const replaySearchQuerySchema = paginationQuerySchema.extend({
  tankId: tankIdSchema.optional(),
  arenaId: slugPart.optional(),
  mode: slugPart.optional(),
  accountId: accountIdSchema.optional(),
  player: nicknameSchema.optional(),
  minDamage: z.coerce.number().int().min(0).optional(),
  minAssist: z.coerce.number().int().min(0).optional().describe('Minimum damage the recorder assisted with: spotting, tracking and stun'),
  minBlocked: z.coerce.number().int().min(0).optional().describe('Minimum damage the recorder blocked with armour'),
  minFrags: z.coerce.number().int().min(0).optional(),
  result: battleResultSchema.optional(),
  clan: z.string().trim().min(1).max(5).optional().describe('Clan tag of the recorder, case-insensitive'),
  tiers: listParam(tierSchema).optional(),
  types: listParam(vehicleTypeSchema).optional(),
  nations: listParam(nationSchema).optional(),
  mastery: replayMasterySchema.optional(),
  version: z.string().trim().min(1).max(32).optional().describe('Exact game version the replay was recorded on'),
  tags: listParam(replayTagSchema).optional().describe('Only replays carrying every one of these automatic tags'),
  sort: replaySortSchema.default('recent')
});

export const replayVersionsSchema = z.object({
  versions: z.array(z.string()).describe('Game versions of public replays, the most recently played first')
});

export const replayPageSchema = paginatedSchema(replaySummarySchema);

export const replayIdParamsSchema = z.object({ id: uuidSchema });

export const uploadReplaySchema = z.object({
  visibility: visibilitySchema.default('public')
});

export const updateReplaySchema = z.object({
  visibility: visibilitySchema
});

export const uploadedReplaySchema = z.object({
  id: uuidSchema,
  status: replayStatusSchema
});

export const bestOfWeekQuerySchema = z.object({
  week: isoDateSchema.optional()
});

export const bestOfWeekSchema = z.object({
  weekStart: isoDateSchema,
  items: z.array(replaySummarySchema)
});

export const heatmapParamsSchema = z.object({ arenaId: slugPart });

export const heatmapQuerySchema = z.object({
  mode: slugPart.default(HEATMAP.allMode),
  scope: slugPart.default(HEATMAP.allScope)
});

export const heatmapSchema = z.object({
  arenaId: z.string(),
  mode: z.string(),
  scope: z.string(),
  gridSize: z.number().int().positive(),
  samples: countSchema,
  cells: z.array(z.number().nonnegative()),
  updatedAt: isoDateTimeSchema.nullable()
});

export const replayTracksSchema = z.object({
  tracks: z.array(
    z.object({
      vehicleId: z.number().int(),
      accountId: z.number().int().nullable(),
      name: z.string(),
      team: z.number().int(),
      tankId: z.number().int().nullable(),
      vehicleType: z.string().nullable(),
      points: z.array(z.tuple([z.number(), z.number(), z.number()]))
    })
  )
});

export const replayParseJobSchema = z.object({ replayId: z.uuid() });
