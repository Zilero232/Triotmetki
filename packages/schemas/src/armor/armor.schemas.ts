import { z } from 'zod';

import { vehicleSummarySchema } from '../vehicles/vehicles.schemas';

export const armorPlateSchema = z.object({
  name: z.string(),
  thickness: z.number().nonnegative(),
  flags: z.number().int().nonnegative()
});

export const armorShellOptionSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  kind: z.string(),
  caliber: z.number().nonnegative(),
  damage: z.number().nonnegative(),
  penetration: z.object({ at100m: z.number().nonnegative(), at500m: z.number().nonnegative() }),
  isPremium: z.boolean()
});

const armorPieceArmorSchema = z.object({
  piece: z.string(),
  plates: z.array(armorPlateSchema)
});

export const armorGunModuleSchema = armorPieceArmorSchema.extend({
  name: z.string(),
  displayName: z.string(),
  shells: z.array(armorShellOptionSchema)
});

export const armorTurretModuleSchema = armorPieceArmorSchema.extend({
  name: z.string(),
  displayName: z.string(),
  guns: z.array(armorGunModuleSchema)
});

const armorChassisModuleSchema = armorPieceArmorSchema.extend({
  name: z.string(),
  displayName: z.string()
});

export const armorModulesSchema = z.object({
  hull: armorPieceArmorSchema,
  chassis: z.array(armorChassisModuleSchema),
  turrets: z.array(armorTurretModuleSchema)
});

const armorModelSourceSchema = z.object({
  repo: z.string(),
  commit: z.string(),
  client: z.string()
});

export const armorModelSchema = z.object({
  vehicle: vehicleSummarySchema,
  gameVersion: z.string(),
  hash: z.string(),
  geometry: z.base64(),
  modules: armorModulesSchema,
  source: armorModelSourceSchema
});

export const armorAttackerGunSchema = armorGunModuleSchema.pick({ name: true, displayName: true, shells: true });

export const armorAttackerSchema = z
  .object({
    vehicle: vehicleSummarySchema,
    guns: z.array(armorAttackerGunSchema)
  })
  .describe('Every gun a vehicle can mount, with its shells, for firing at another vehicle in the armor viewer');
