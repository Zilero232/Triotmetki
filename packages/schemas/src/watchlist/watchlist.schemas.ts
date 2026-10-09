import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema, percentSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { WATCHLIST, WATCHLIST_DIGESTS, WATCHLIST_PERIODS } from './watchlist.constants';

export const watchlistDigestSchema = z.enum(WATCHLIST_DIGESTS).describe('How often the digest of the watched players is sent; hourly needs Plus');

export const watchlistPeriodSchema = z.enum(WATCHLIST_PERIODS);

export const watchlistQuerySchema = z.object({
  period: watchlistPeriodSchema.default(WATCHLIST.defaultPeriod)
});

export const watchlistPlayerSchema = z.object({
  followId: uuidSchema,
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  clanTag: z.string().nullable(),
  watchedSince: isoDateTimeSchema,
  lastBattleAt: isoDateTimeSchema.nullable(),
  battles: countSchema,
  wins: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  marksGained: countSchema,
  wn8: z.number().nullable().describe('WN8 over the last 7 days')
});

export const watchlistSchema = z.object({
  period: watchlistPeriodSchema,
  digest: watchlistDigestSchema,
  lastDigestAt: isoDateTimeSchema.nullable(),
  limit: countSchema,
  players: z.array(watchlistPlayerSchema)
});

export const addWatchlistPlayerSchema = z.object({
  accountId: accountIdSchema
});

export const watchlistPlayerParamsSchema = z.object({
  accountId: accountIdSchema
});

export const updateWatchlistSettingsSchema = z.object({
  digest: watchlistDigestSchema
});

export const watchlistSettingsSchema = z.object({
  digest: watchlistDigestSchema,
  lastDigestAt: isoDateTimeSchema.nullable()
});
