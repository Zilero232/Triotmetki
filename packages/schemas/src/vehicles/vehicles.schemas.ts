import * as z from 'zod';

import { tankIdSchema } from '../common/primitives/primitives.schemas';
import { booleanParam, listParam } from '../common/query/query.schemas';
import { TANK_ROLES, TANK_STATUSES } from '../tanks/insights/insights.constants';

export const vehicleTypeSchema = z.enum(['lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG']);

export const tierSchema = z.coerce.number().int().min(1).max(11);

export const nationSchema = z.string().min(1).max(32);

export const tankRoleSchema = z.enum(TANK_ROLES);

export const tankStatusSchema = z.enum(TANK_STATUSES);

export const vehicleImagesSchema = z.object({
  small: z.url().nullable(),
  contour: z.url().nullable(),
  big: z.url().nullable(),
  large: z
    .url()
    .nullable()
    .optional()
    .describe('600×450 render from the Lesta client assets for large displays; fall back to `big` when it is missing or fails to load')
});

export const vehicleSummarySchema = z.object({
  tankId: tankIdSchema,
  name: z.string(),
  shortName: z.string(),
  slug: z.string(),
  nation: nationSchema,
  type: vehicleTypeSchema,
  tier: tierSchema,
  isPremium: z.boolean(),
  isCollectible: z.boolean(),
  status: tankStatusSchema.describe(
    'How the vehicle is obtained: researched in the tech tree, sold for gold, a collector vehicle, a reward, or no longer obtainable'
  ),
  images: vehicleImagesSchema
});

export const vehicleFilterSchema = z.object({
  tiers: listParam(tierSchema).optional(),
  types: listParam(vehicleTypeSchema).optional(),
  nations: listParam(nationSchema).optional(),
  premium: booleanParam.optional(),
  collectible: booleanParam.optional(),
  statuses: listParam(tankStatusSchema).optional().describe('Only vehicles with one of these statuses'),
  roles: listParam(tankRoleSchema).optional().describe('Only vehicles with one of these battle roles')
});

export const vehicleCatalogItemSchema = vehicleSummarySchema.extend({
  role: tankRoleSchema.nullable().describe('Battle role from the game client, null when the vehicle has none'),
  isPreferential: z.boolean().describe('Preferential matchmaking: the game client tags the vehicle to meet at most one tier higher')
});

export const vehicleCatalogSchema = z.array(vehicleCatalogItemSchema);
