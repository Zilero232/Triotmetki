import { z } from 'zod';

import { accountIdSchema, isoDateSchema, isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { OFFICIAL_RATING_FIELDS, OFFICIAL_RATING_PERIODS, OFFICIAL_RATINGS } from './official-ratings.constants';

export const officialRatingPeriodSchema = z
  .enum(OFFICIAL_RATING_PERIODS)
  .describe('Lesta rating period: 1d, 7d and 28d are the last day, week and four weeks; overall is the whole career');

export const officialRatingFieldSchema = z
  .enum(OFFICIAL_RATING_FIELDS)
  .describe('Lesta rank field; winRate, survivalRate and accuracy are percents, the rest per-battle averages or totals');

export const officialRankSchema = z.object({
  value: z.number().nullable(),
  rank: z.number().int().positive().nullable().describe('Place on the server, 1 is the best'),
  rankDelta: z.number().int().nullable().describe('Places gained since the previous day; positive means up')
});

export const officialRatingStatsSchema = z.object({
  period: officialRatingPeriodSchema,
  fields: z.partialRecord(officialRatingFieldSchema, officialRankSchema).describe('Only the fields Lesta ranked the player on')
});

export const playerOfficialRatingsSchema = z.object({
  accountId: accountIdSchema,
  fetchedAt: isoDateTimeSchema,
  periods: z.array(officialRatingStatsSchema).describe('Periods Lesta offers and ranks the player in; an unranked period is left out')
});

export const officialRatingQuerySchema = z.object({
  period: officialRatingPeriodSchema.default(OFFICIAL_RATINGS.defaultPeriod),
  field: officialRatingFieldSchema.default(OFFICIAL_RATINGS.defaultField)
});

export const officialTopQuerySchema = officialRatingQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(OFFICIAL_RATINGS.top.maxLimit).default(OFFICIAL_RATINGS.top.defaultLimit),
  page: z.coerce.number().int().min(1).max(OFFICIAL_RATINGS.top.maxPage).default(1)
});

export const officialNeighborsQuerySchema = officialRatingQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(OFFICIAL_RATINGS.neighbors.maxLimit).default(OFFICIAL_RATINGS.neighbors.defaultLimit)
});

export const officialRankHistoryQuerySchema = officialRatingQuerySchema.extend({
  days: z.coerce.number().int().min(1).max(OFFICIAL_RATINGS.history.maxDays).default(OFFICIAL_RATINGS.history.defaultDays)
});

export const officialTopEntrySchema = officialRankSchema.extend({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  clanTag: z.string().nullable()
});

export const officialTopSchema = z.object({
  period: officialRatingPeriodSchema,
  field: officialRatingFieldSchema,
  items: z.array(officialTopEntrySchema)
});

export const officialNeighborsSchema = officialTopSchema.extend({
  accountId: accountIdSchema
});

export const officialRankPointSchema = z.object({
  date: isoDateSchema,
  value: z.number().nullable(),
  rank: z.number().int().positive().nullable()
});

export const officialRankHistorySchema = z.object({
  accountId: accountIdSchema,
  period: officialRatingPeriodSchema,
  field: officialRatingFieldSchema,
  points: z.array(officialRankPointSchema)
});
