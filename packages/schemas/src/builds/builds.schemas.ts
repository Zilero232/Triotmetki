import { z } from 'zod';

import { countSchema, isoDateTimeSchema, percentSchema, ratioSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { listParam } from '../common/query/query.schemas';
import { LOADOUT } from '../community/community.constants';
import { loadoutSchema } from '../community/community.schemas';
import { learningDifficultySchema } from '../tanks/insights/insights.schemas';
import { vehicleFilterSchema, vehicleSummarySchema } from '../vehicles/vehicles.schemas';
import { BUILD_OPTIONS, BUILD_USAGE, POPULAR_BUILDS } from './builds.constants';

export const vehicleProfileIdSchema = z.enum(BUILD_OPTIONS.profiles);

export const shellStatsSchema = z.object({
  shell: z.string(),
  kind: z.string().nullable(),
  caliber: z.number().nonnegative().nullable(),
  isPremium: z.boolean(),
  damage: countSchema,
  penetration100m: z.number().nonnegative(),
  penetration500m: z.number().nonnegative(),
  speed: z.number().nonnegative(),
  explosionRadius: z.number().nonnegative().nullable(),
  damagePerMinute: z.number().nonnegative()
});

export const vehicleStatsSchema = z
  .object({
    modules: z.record(z.string(), z.string()),
    maxHealth: countSchema,
    weight: z.number().nonnegative(),
    enginePower: z.number().nonnegative(),
    powerToWeight: z.number().nonnegative(),
    speedForward: z.number().nonnegative(),
    speedBackward: z.number().nonnegative(),
    hullTraverse: z.number().nonnegative(),
    turretTraverse: z.number().nonnegative(),
    viewRange: z.number().nonnegative(),
    radioRange: z.number().nonnegative(),
    reloadTime: z.number().nonnegative(),
    rateOfFire: z.number().nonnegative(),
    aimingTime: z.number().nonnegative(),
    dispersion: z.number().nonnegative(),
    dispersionMovement: z.number().nonnegative(),
    dispersionHullRotation: z.number().nonnegative(),
    dispersionTurretRotation: z.number().nonnegative(),
    elevation: z.number().nullable(),
    depression: z.number().nullable(),
    clip: z.object({ count: countSchema, interval: z.number().nonnegative(), reloadTime: z.number().nonnegative() }).nullable(),
    shell: shellStatsSchema.nullable(),
    shells: z.array(shellStatsSchema)
  })
  .describe('Final stats of one module configuration in seconds, metres, km/h, hp and degrees per second; shell is the first (standard) shell');

export const modifierEffectSchema = z.object({
  attribute: z.string(),
  op: z.enum(['add', 'mul']),
  value: z.number(),
  specValue: z.number().nullable(),
  condition: z.string().nullable()
});

export const priceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string()
});

export const provisionKindSchema = z.enum(BUILD_OPTIONS.provisionKinds);

export const provisionOptionSchema = z.object({
  id: z.number().int().positive(),
  tag: z.string(),
  name: z.string(),
  kind: provisionKindSchema,
  variant: z.string().nullable(),
  group: z.string().nullable(),
  image: z.string().nullable(),
  price: priceSchema.nullable(),
  categories: z.array(z.string()),
  effects: z.array(modifierEffectSchema)
});

export const crewSkillOptionSchema = z.object({
  skill: z.string(),
  name: z.string(),
  nameEn: z.string().nullable().describe('English name from the Lesta encyclopedia; null until it is synced'),
  roles: z.array(z.string()),
  isCommon: z.boolean(),
  image: z.string().nullable(),
  params: z.array(z.object({ name: z.string(), perLevel: z.number(), situational: z.boolean() }))
});

export const moduleOptionSchema = z.object({
  moduleId: z.number().int(),
  name: z.string().describe('The key to select this module in a loadout request'),
  displayName: z.string(),
  tier: z.number().int().nullable()
});

export const fieldModificationStepSchema = z.object({
  level: z.number().int().positive(),
  kind: z.enum(['modification', 'pair']),
  options: z.array(provisionOptionSchema)
});

export const buildOptionsSchema = z.object({
  tankId: tankIdSchema,
  modules: z.object({
    chassis: z.array(moduleOptionSchema),
    turrets: z.array(moduleOptionSchema.extend({ guns: z.array(moduleOptionSchema) })),
    engines: z.array(moduleOptionSchema),
    radios: z.array(moduleOptionSchema)
  }),
  crew: z.array(z.object({ role: z.string(), extraRoles: z.array(z.string()) })),
  optionalDevices: z.array(provisionOptionSchema),
  consumables: z.array(provisionOptionSchema),
  directives: z.array(provisionOptionSchema),
  fieldModifications: z.array(fieldModificationStepSchema),
  crewSkills: z.array(crewSkillOptionSchema),
  slots: z.object({ optionalDevices: countSchema, consumables: countSchema, directives: countSchema })
});

const moduleName = z.string().max(LOADOUT.nameLength);

const moduleSelectionSchema = z.object({
  chassis: moduleName.optional(),
  turret: moduleName.optional(),
  gun: moduleName.optional(),
  engine: moduleName.optional(),
  radio: moduleName.optional()
});

export const moduleSlotSchema = moduleSelectionSchema.keyof();

export const loadoutRequestSchema = z.object({
  loadout: loadoutSchema,
  modules: moduleSelectionSchema.optional().describe('Exact modules by name; overrides loadout.profileId'),
  specialized: z.array(z.boolean()).max(BUILD_OPTIONS.maxSpecializedSlots).default([]).describe('Per equipment slot: is it a specialization slot'),
  crewLevel: z.number().int().min(50).max(100).default(100),
  state: z
    .object({ still: z.boolean().default(false), consumablesActive: z.boolean().default(false) })
    .default({ still: false, consumablesActive: false })
});

export const loadoutResultSchema = z.object({
  tankId: tankIdSchema,
  profileId: z.string(),
  stats: vehicleStatsSchema,
  crew: z.object({ crewLevelIncrease: z.number(), levels: z.record(z.string(), z.number()) }),
  ignored: z.array(z.string()).describe('Loadout items that do not exist or do not fit this vehicle and were left out')
});

export const buildModeSchema = z
  .enum(BUILD_USAGE.modes)
  .describe('random: random battles; onslaught: Onslaught; frontline: Front Line; ranked: ranked battles');

export const buildCohortSchema = z
  .enum(BUILD_USAGE.cohorts)
  .describe('all: every player with the mod; top10 / top1: the best 10% / 1% on this tank by our rating (top1 needs Plus)');

export const popularBuildsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(POPULAR_BUILDS.maxLimit).default(POPULAR_BUILDS.defaultLimit),
  mode: buildModeSchema.optional().describe('Only battles of this mode; every mode when omitted')
});

export const popularBuildSchema = z.object({
  optionalDevices: z.array(provisionOptionSchema),
  consumables: z.array(provisionOptionSchema),
  directives: z.array(provisionOptionSchema),
  battles: countSchema,
  share: ratioSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const popularBuildsSchema = z.object({
  tankId: tankIdSchema,
  source: z.enum(POPULAR_BUILDS.sources).describe('battles: loadouts the mod reported; builds: published community builds; none: no data yet'),
  sampleSize: countSchema,
  builds: z.array(popularBuildSchema)
});

const pickStats = {
  battles: countSchema.describe('Battles with this pick'),
  share: ratioSchema.describe('Share of players who pick it, each player weighted equally'),
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
};

export const provisionPickSchema = z.object({ option: provisionOptionSchema, ...pickStats });

export const equipmentSlotUsageSchema = z.object({
  slot: z.number().int().nonnegative(),
  picks: z.array(provisionPickSchema)
});

export const fieldModificationUsageSchema = z.object({
  level: z.number().int().positive(),
  kind: fieldModificationStepSchema.shape.kind,
  picks: z.array(provisionPickSchema)
});

export const crewSkillPickSchema = z.object({
  skill: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  isCommon: z.boolean(),
  share: ratioSchema.describe('Share of crew members of this role who learned it'),
  avgPosition: z.number().nonnegative().describe('Average learning order, 0 = the first skill')
});

export const crewRoleUsageSchema = z.object({
  role: z.string(),
  members: countSchema,
  skills: z.array(crewSkillPickSchema)
});

export const shellUsageSchema = z.object({
  shellId: z.number().int().positive(),
  name: z.string().nullable(),
  kind: z.string().nullable(),
  isPremium: z.boolean(),
  share: ratioSchema.describe('Share of players who carry this shell'),
  ammoShare: ratioSchema.describe('Share of the loaded ammunition'),
  avgCount: z.number().nonnegative()
});

export const buildUsageSchema = z.object({
  mode: buildModeSchema,
  cohort: buildCohortSchema,
  battles: countSchema,
  players: countSchema,
  minSample: countSchema,
  isEnough: z.boolean().describe('False while the sample is below minSample; shares are withheld then'),
  windowDays: countSchema,
  gameVersion: z.string().nullable(),
  computedAt: isoDateTimeSchema.nullable(),
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  equipment: z.array(equipmentSlotUsageSchema),
  consumables: z.array(provisionPickSchema),
  directives: z.array(provisionPickSchema),
  shells: z.array(shellUsageSchema),
  fieldModifications: z.array(fieldModificationUsageSchema),
  crew: z.array(crewRoleUsageSchema)
});

export const buildUsageQuerySchema = z.object({
  mode: buildModeSchema.default(BUILD_USAGE.defaultMode),
  cohort: buildCohortSchema.default(BUILD_USAGE.defaultCohort)
});

export const recommendedBuildSchema = z.object({
  tankId: tankIdSchema,
  usage: buildUsageSchema,
  loadout: loadoutSchema.nullable().describe('The most picked option on every axis, ready for the constructor; null without enough data'),
  result: loadoutResultSchema.nullable()
});

const compactDescrSchema = z.number().int().positive();

export const buildAdviceSchema = z.object({
  tankId: tankIdSchema,
  isEnough: z.boolean().describe('False while the sample is below minSample; the lists are empty then'),
  battles: countSchema,
  equipment: z.array(compactDescrSchema).describe('Compact descriptors (the client intCD) of the recommended equipment'),
  directives: z.array(compactDescrSchema).describe('Compact descriptors of the recommended directives (battle boosters)'),
  consumables: z.array(compactDescrSchema).describe('Compact descriptors of the recommended consumables')
});

export const buildHistoryEntrySchema = z.object({
  gameVersion: z.string(),
  computedAt: isoDateTimeSchema,
  battles: countSchema,
  players: countSchema,
  winRate: percentSchema.nullable(),
  equipment: z.array(provisionPickSchema),
  consumables: z.array(provisionPickSchema),
  directives: z.array(provisionPickSchema),
  fieldModifications: z.array(provisionPickSchema)
});

export const buildHistorySchema = z.object({
  tankId: tankIdSchema,
  mode: buildModeSchema,
  cohort: buildCohortSchema,
  entries: z.array(buildHistoryEntrySchema)
});

export const buildsCatalogQuerySchema = z.object({
  ...vehicleFilterSchema.shape,
  mode: buildModeSchema.default(BUILD_USAGE.defaultMode),
  difficulties: listParam(learningDifficultySchema).optional().describe('Only tanks whose learning curve puts them in one of these difficulties')
});

export const buildsCatalogEntrySchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  players: countSchema,
  isEnough: z.boolean(),
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  topEquipment: z.array(provisionPickSchema),
  topConsumables: z.array(provisionPickSchema),
  computedAt: isoDateTimeSchema.nullable()
});

export const buildsCatalogSchema = z.object({
  mode: buildModeSchema,
  cohort: buildCohortSchema,
  minSample: countSchema,
  entries: z.array(buildsCatalogEntrySchema)
});
