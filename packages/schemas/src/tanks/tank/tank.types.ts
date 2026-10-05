import type { z } from 'zod';

import type {
  tankDetailQuerySchema,
  tankDetailSchema,
  tankPatchChangeSchema,
  tankPatchesSchema,
  tankPatchSchema,
  tankPatchVerdictSchema,
  tankServerStatsQuerySchema,
  tankServerStatsRowSchema,
  tankServerStatsSortFieldSchema,
  tankStatsPageSchema,
  tankTrendPointSchema,
  tankTrendQuerySchema,
  tankTrendSchema,
  tierListEntrySchema,
  tierListQuerySchema,
  tierListRankSchema,
  tierListSchema,
  topPlayersMetricSchema,
  topPlayersQuerySchema,
  topPlayersSchema
} from './tank.schemas';

export type TierListRank = z.infer<typeof tierListRankSchema>;
export type TankServerStatsRow = z.infer<typeof tankServerStatsRowSchema>;
export type TankServerStatsSortField = z.infer<typeof tankServerStatsSortFieldSchema>;
export type TankServerStatsQuery = z.infer<typeof tankServerStatsQuerySchema>;
export type TierListEntry = z.infer<typeof tierListEntrySchema>;
export type TierList = z.infer<typeof tierListSchema>;
export type TierListQuery = z.infer<typeof tierListQuerySchema>;
export type TankDetailQuery = z.infer<typeof tankDetailQuerySchema>;
export type TankDetail = z.infer<typeof tankDetailSchema>;
export type TopPlayersMetric = z.infer<typeof topPlayersMetricSchema>;
export type TopPlayersQuery = z.infer<typeof topPlayersQuerySchema>;
export type TopPlayers = z.infer<typeof topPlayersSchema>;
export type TankTrendQuery = z.infer<typeof tankTrendQuerySchema>;
export type TankTrendPoint = z.infer<typeof tankTrendPointSchema>;
export type TankTrend = z.infer<typeof tankTrendSchema>;
export type TankPatchChange = z.infer<typeof tankPatchChangeSchema>;
export type TankPatchVerdict = z.infer<typeof tankPatchVerdictSchema>;
export type TankPatch = z.infer<typeof tankPatchSchema>;
export type TankPatches = z.infer<typeof tankPatchesSchema>;
export type TankStatsPage = z.infer<typeof tankStatsPageSchema>;
