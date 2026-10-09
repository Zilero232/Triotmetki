import * as z from 'zod';

import {
  accountIdSchema,
  countSchema,
  httpUrlSchema,
  isoDateTimeSchema,
  percentDeltaSchema,
  percentSchema,
  tankIdSchema
} from '../../common/primitives/primitives.schemas';
import { listParam, paginatedSchema, paginationQuerySchema, sortQuery } from '../../common/query/query.schemas';
import { tankRoleSchema, tankStatusSchema, vehicleFilterSchema, vehicleSummarySchema } from '../../vehicles/vehicles.schemas';
import { vehicleSourceMissionSchema, vehicleSourceSchema } from '../vehicle-sources/vehicle-sources.schemas';
import { ECONOMY_ACCOUNTS, LEARNING_DIFFICULTIES, TANK_ECONOMY, TANK_SOURCES } from './insights.constants';

export { tankStatusSchema } from '../../vehicles/vehicles.schemas';

export const tankSourceSchema = z.enum(TANK_SOURCES);

export const tankTraitsSchema = z.object({
  status: tankStatusSchema,
  role: tankRoleSchema.nullable()
});

export const learningDifficultySchema = z.enum(LEARNING_DIFFICULTIES);

export const tankTraitsFilterSchema = vehicleFilterSchema.pick({ statuses: true, roles: true }).extend({
  difficulties: listParam(learningDifficultySchema).optional().describe('Only tanks whose learning curve puts them in one of these difficulties')
});

const tankOfferSchema = z.object({
  title: z.string(),
  url: httpUrlSchema.nullable(),
  startsAt: isoDateTimeSchema.nullable(),
  endsAt: isoDateTimeSchema.nullable(),
  lastSeenAt: isoDateTimeSchema,
  priceRub: z.number().nonnegative().nullable(),
  priceGold: countSchema.nullable(),
  discountPercent: z.number().int().nullable()
});

const tankMentionSchema = z.object({
  title: z.string(),
  url: httpUrlSchema,
  publishedAt: isoDateTimeSchema
});

const tankResearchStepSchema = z.object({
  vehicle: vehicleSummarySchema,
  xp: countSchema.nullable()
});

export const tankObtainSchema = z.object({
  status: tankStatusSchema,
  role: tankRoleSchema.nullable(),
  sources: z.array(tankSourceSchema),
  priceCredits: countSchema.nullable(),
  priceGold: countSchema.nullable(),
  researchFrom: z.array(tankResearchStepSchema),
  offers: z.object({ total: countSchema, items: z.array(tankOfferSchema) }),
  news: z.array(tankMentionSchema),
  missions: z.array(vehicleSourceMissionSchema).describe('Personal-mission operations and campaigns that award this tank'),
  editorial: z.array(vehicleSourceSchema).describe('Editorial sources: events, battle pass, bonds, workshop and so on')
});

export const economyAccountSchema = z.enum(ECONOMY_ACCOUNTS);

const median = z.number().nullable();

export const tankEconomyFiguresSchema = z.object({
  battles: countSchema,
  players: countSchema,
  costBattles: countSchema.describe('Battles whose repair, ammo and consumable costs were reported by the mod'),
  credits: median.describe('Median credits earned per battle, all bonuses included'),
  creditsBase: median.describe('Median credits earned before the premium account bonus'),
  repair: median,
  ammo: median,
  consumables: median,
  net: median.describe('Median credits earned minus repair, ammo and consumables'),
  xp: median,
  freeXp: median
});

export const tankEconomySchema = z.object({
  tankId: tankIdSchema,
  windowDays: countSchema,
  all: tankEconomyFiguresSchema.nullable(),
  premium: tankEconomyFiguresSchema.nullable(),
  standard: tankEconomyFiguresSchema.nullable(),
  computedAt: isoDateTimeSchema.nullable()
});

const tankEconomySortFieldSchema = z.enum(['tier', 'battles', 'credits', 'net', 'xp', 'freeXp']);

export const tankEconomyQuerySchema = z.object({
  ...vehicleFilterSchema.shape,
  ...tankTraitsFilterSchema.shape,
  ...sortQuery(tankEconomySortFieldSchema).shape,
  ...paginationQuerySchema.shape,
  account: economyAccountSchema.default('premium'),
  minBattles: z.coerce.number().int().nonnegative().default(0)
});

export const tankEconomyRowSchema = z.object({
  vehicle: vehicleSummarySchema,
  traits: tankTraitsSchema,
  economy: tankEconomySchema
});

export const tankEconomyPageSchema = paginatedSchema(tankEconomyRowSchema);

export const accountEconomyQuerySchema = z.object({
  days: z.coerce.number().int().min(TANK_ECONOMY.minDays).max(TANK_ECONOMY.maxDays).default(TANK_ECONOMY.windowDays)
});

export const accountEconomySplitSchema = z.object({
  battles: countSchema,
  credits: z.number().nullable().describe('Average credits earned per battle'),
  net: z.number().nullable().describe('Average credits after costs per battle, over battles with reported costs')
});

const accountEconomyTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  credits: z.number(),
  net: z.number().nullable(),
  xp: z.number()
});

export const accountEconomySchema = z.object({
  accountId: accountIdSchema,
  days: countSchema,
  battles: countSchema,
  totalCredits: z.number(),
  totalNet: z.number().nullable(),
  premium: accountEconomySplitSchema,
  standard: accountEconomySplitSchema,
  premiumBonus: z.object({
    earned: z.number().describe('Credits the premium account added over the premium battles in the window'),
    missed: z.number().describe('Credits a premium account would have added over the standard battles in the window'),
    perBattle: z.number().nullable()
  }),
  tanks: z.array(accountEconomyTankSchema)
});

export const learningBucketSchema = z.object({
  index: z.number().int().nonnegative(),
  from: countSchema,
  to: countSchema.nullable(),
  battles: countSchema,
  players: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const tankLearningSchema = z.object({
  tankId: tankIdSchema,
  windowDays: countSchema,
  buckets: z.array(learningBucketSchema),
  gain: percentDeltaSchema.nullable().describe('Win-rate gain from the first to the last bucket with enough battles'),
  difficulty: learningDifficultySchema.nullable(),
  computedAt: isoDateTimeSchema.nullable()
});

export const myTankLearningSchema = z.object({
  tankId: tankIdSchema,
  accountId: accountIdSchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  bucket: z.number().int().nonnegative(),
  bucketWinRate: percentSchema.nullable(),
  delta: percentDeltaSchema.nullable()
});
