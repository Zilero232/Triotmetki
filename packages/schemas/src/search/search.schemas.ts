import * as z from 'zod';

import { accountIdSchema, clanIdSchema, countSchema } from '../common/primitives/primitives.schemas';
import { listParam } from '../common/query/query.schemas';
import { ratingValueSchema } from '../common/rating/rating.schemas';
import { vehicleSummarySchema } from '../vehicles/vehicles.schemas';
import { SEARCH } from './search.constants';

const searchKindSchema = z.enum(['player', 'clan', 'tank', 'map']);

export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH.minLength).max(SEARCH.maxLength),
  kinds: listParam(searchKindSchema).optional(),
  limit: z.coerce.number().int().min(1).max(SEARCH.maxLimit).default(SEARCH.defaultLimit)
});

export const playerSearchResultSchema = z.object({
  kind: z.literal('player'),
  accountId: accountIdSchema,
  nickname: z.string(),
  clanTag: z.string().nullable(),
  matchedNickname: z.string().nullable(),
  wn8: ratingValueSchema,
  battles: countSchema.nullable()
});

export const clanSearchResultSchema = z.object({
  kind: z.literal('clan'),
  clanId: clanIdSchema,
  tag: z.string(),
  name: z.string(),
  membersCount: countSchema,
  emblem: z.url().nullable()
});

export const tankSearchResultSchema = z.object({
  kind: z.literal('tank'),
  vehicle: vehicleSummarySchema
});

export const mapSearchResultSchema = z.object({
  kind: z.literal('map'),
  arenaId: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.url().nullable()
});

export const searchResultSchema = z.discriminatedUnion('kind', [
  playerSearchResultSchema,
  clanSearchResultSchema,
  tankSearchResultSchema,
  mapSearchResultSchema
]);

export const searchResponseSchema = z.object({
  query: z.string(),
  correctedQuery: z.string().nullable(),
  results: z.array(searchResultSchema)
});
