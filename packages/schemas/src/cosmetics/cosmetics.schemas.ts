import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { listParam } from '../common/query/query.schemas';
import { COSMETIC_CODE, COSMETIC_GRADES, COSMETIC_SLOTS, COSMETIC_SOURCES, PROFILE_COSMETIC_SLOTS, PROFILE_COSMETICS } from './cosmetics.constants';

export const cosmeticSlotSchema = z.enum(COSMETIC_SLOTS);

export const profileCosmeticSlotSchema = z.enum(PROFILE_COSMETIC_SLOTS);

export const cosmeticSourceSchema = z.enum(COSMETIC_SOURCES);

export const cosmeticGradeSchema = z.enum(COSMETIC_GRADES);

const cosmeticCodeSchema = z.string().regex(COSMETIC_CODE.pattern);

export const cosmeticCodeParamsSchema = z.object({
  code: cosmeticCodeSchema
});

export const cosmeticInventoryItemSchema = z.object({
  code: cosmeticCodeSchema,
  slot: cosmeticSlotSchema,
  source: cosmeticSourceSchema,
  price: countSchema.nullable(),
  season: z.string().nullable(),
  grade: cosmeticGradeSchema.nullable(),
  isOwned: z.boolean(),
  isUsable: z.boolean(),
  acquiredAt: isoDateTimeSchema.nullable()
});

export const equippedCosmeticsSchema = z.object({
  badge: cosmeticCodeSchema.nullable(),
  frame: cosmeticCodeSchema.nullable(),
  banner: cosmeticCodeSchema.nullable()
});

export const equipCosmeticsSchema = equippedCosmeticsSchema.partial();

export const cosmeticsInventorySchema = z.object({
  isPlus: z.boolean(),
  balance: countSchema,
  equipped: equippedCosmeticsSchema,
  items: z.array(cosmeticInventoryItemSchema)
});

export const profileCosmeticsSchema = equippedCosmeticsSchema.extend({
  accountId: accountIdSchema
});

export const profileCosmeticsListSchema = z.object({
  items: z.array(profileCosmeticsSchema)
});

export const profileCosmeticsQuerySchema = z.object({
  accountIds: listParam(accountIdSchema).refine((ids) => ids.length > 0 && ids.length <= PROFILE_COSMETICS.maxBatch)
});
