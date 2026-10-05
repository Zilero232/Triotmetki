import type { z } from 'zod';

import type {
  officialNeighborsQuerySchema,
  officialNeighborsSchema,
  officialRankHistoryQuerySchema,
  officialRankHistorySchema,
  officialRankPointSchema,
  officialRankSchema,
  officialRatingFieldSchema,
  officialRatingPeriodSchema,
  officialRatingStatsSchema,
  officialTopEntrySchema,
  officialTopQuerySchema,
  officialTopSchema,
  playerOfficialRatingsSchema
} from './official-ratings.schemas';

export type OfficialRatingPeriod = z.infer<typeof officialRatingPeriodSchema>;
export type OfficialRatingField = z.infer<typeof officialRatingFieldSchema>;
export type OfficialRank = z.infer<typeof officialRankSchema>;
export type OfficialRatingStats = z.infer<typeof officialRatingStatsSchema>;
export type PlayerOfficialRatings = z.infer<typeof playerOfficialRatingsSchema>;
export type OfficialTopQuery = z.infer<typeof officialTopQuerySchema>;
export type OfficialNeighborsQuery = z.infer<typeof officialNeighborsQuerySchema>;
export type OfficialRankHistoryQuery = z.infer<typeof officialRankHistoryQuerySchema>;
export type OfficialTopEntry = z.infer<typeof officialTopEntrySchema>;
export type OfficialTop = z.infer<typeof officialTopSchema>;
export type OfficialNeighbors = z.infer<typeof officialNeighborsSchema>;
export type OfficialRankPoint = z.infer<typeof officialRankPointSchema>;
export type OfficialRankHistory = z.infer<typeof officialRankHistorySchema>;
