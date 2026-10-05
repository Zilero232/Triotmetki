import {
  accountIdSchema,
  countSchema,
  isoDateTimeSchema,
  paginatedSchema,
  paginationQuerySchema,
  percentSchema,
  tierSchema,
  vehicleSummarySchema,
  vehicleTypeSchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { RARITY_TIER_NAMES } from '../config/rarity.constants';
import { ACHIEVEMENTS_VIEW } from '../config/view.constants';

const rarityTierSchema = z.enum(RARITY_TIER_NAMES);

export const achievementsQuerySchema = z.object({
  section: z.string().trim().min(1).max(32).optional(),
  sort: z.enum(ACHIEVEMENTS_VIEW.catalogSorts).default('rarity')
});

export const achievementRarityItemSchema = z.object({
  name: z.string(),
  title: z.string(),
  titleEn: z.string().nullable(),
  description: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  section: z.string().nullable(),
  image: z.string().nullable(),
  holders: countSchema,
  share: percentSchema.nullable(),
  points: countSchema.nullable(),
  tier: rarityTierSchema.nullable()
});

export const achievementsCatalogSchema = z.object({
  sample: countSchema,
  catalogSize: countSchema,
  sections: z.array(z.string()),
  rarest: achievementRarityItemSchema.nullable(),
  computedAt: isoDateTimeSchema.nullable(),
  items: z.array(achievementRarityItemSchema)
});

export const tankRarityQuerySchema = z.object({
  tier: tierSchema.optional(),
  type: vehicleTypeSchema.optional(),
  sort: z.enum(ACHIEVEMENTS_VIEW.tankSorts).default('rare')
});

export const tankRarityItemSchema = z.object({
  vehicle: vehicleSummarySchema,
  owners: countSchema,
  share: percentSchema,
  tier: rarityTierSchema
});

export const tankRaritySchema = z.object({
  sample: countSchema,
  computedAt: isoDateTimeSchema.nullable(),
  items: z.array(tankRarityItemSchema)
});

export const collectorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(ACHIEVEMENTS_VIEW.leaderboardMaxLimit).default(ACHIEVEMENTS_VIEW.leaderboardDefaultLimit),
  offset: paginationQuerySchema.shape.offset
});

export const collectorRowSchema = z.object({
  rank: z.number().int().positive(),
  accountId: accountIdSchema,
  nickname: z.string(),
  clanTag: z.string().nullable(),
  held: countSchema,
  points: countSchema,
  completion: percentSchema
});

export const collectorsSchema = paginatedSchema(collectorRowSchema);

export const collectionParamsSchema = z.object({
  accountId: accountIdSchema
});

export const heldAchievementSchema = achievementRarityItemSchema.extend({
  count: countSchema
});

const seriesRowSchema = z.object({
  name: z.string(),
  title: z.string(),
  titleEn: z.string().nullable(),
  image: z.string().nullable(),
  best: countSchema,
  threshold: countSchema,
  progress: percentSchema,
  achieved: z.boolean()
});

export const playerCollectionSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string(),
  fetchedAt: isoDateTimeSchema.nullable(),
  held: countSchema,
  points: countSchema,
  completion: percentSchema,
  obtainable: countSchema,
  rank: z.number().int().positive().nullable(),
  topPercent: percentSchema.nullable(),
  sample: countSchema,
  rarest: z.array(heldAchievementSchema),
  series: z.array(seriesRowSchema),
  showcase: z.array(heldAchievementSchema).nullable(),
  viewerIsOwner: z.boolean()
});
