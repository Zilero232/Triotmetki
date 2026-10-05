import type { z } from 'zod';

import type {
  buildAdviceSchema,
  buildCohortSchema,
  buildHistoryEntrySchema,
  buildHistorySchema,
  buildModeSchema,
  buildOptionsSchema,
  buildsCatalogEntrySchema,
  buildsCatalogQuerySchema,
  buildsCatalogSchema,
  buildUsageQuerySchema,
  buildUsageSchema,
  crewRoleUsageSchema,
  crewSkillPickSchema,
  fieldModificationStepSchema,
  loadoutRequestSchema,
  loadoutResultSchema,
  modifierEffectSchema,
  moduleOptionSchema,
  moduleSlotSchema,
  popularBuildSchema,
  popularBuildsQuerySchema,
  popularBuildsSchema,
  provisionKindSchema,
  provisionOptionSchema,
  provisionPickSchema,
  recommendedBuildSchema,
  shellStatsSchema,
  shellUsageSchema,
  vehicleStatsSchema
} from './builds.schemas';

export type ShellStats = z.infer<typeof shellStatsSchema>;
export type VehicleStats = z.infer<typeof vehicleStatsSchema>;
export type ModifierEffect = z.infer<typeof modifierEffectSchema>;
export type ProvisionKind = z.infer<typeof provisionKindSchema>;
export type ProvisionOption = z.infer<typeof provisionOptionSchema>;
export type ModuleOption = z.infer<typeof moduleOptionSchema>;
export type FieldModificationStep = z.infer<typeof fieldModificationStepSchema>;
export type BuildOptions = z.infer<typeof buildOptionsSchema>;
export type LoadoutRequest = z.input<typeof loadoutRequestSchema>;
export type ParsedLoadoutRequest = z.output<typeof loadoutRequestSchema>;
export type LoadoutResult = z.infer<typeof loadoutResultSchema>;
export type PopularBuildsQuery = z.infer<typeof popularBuildsQuerySchema>;
export type PopularBuild = z.infer<typeof popularBuildSchema>;
export type PopularBuilds = z.infer<typeof popularBuildsSchema>;

export type BuildMode = z.infer<typeof buildModeSchema>;
export type BuildCohort = z.infer<typeof buildCohortSchema>;
export type ProvisionPick = z.infer<typeof provisionPickSchema>;
export type CrewSkillPick = z.infer<typeof crewSkillPickSchema>;
export type CrewRoleUsage = z.infer<typeof crewRoleUsageSchema>;
export type ShellUsage = z.infer<typeof shellUsageSchema>;
export type BuildUsage = z.infer<typeof buildUsageSchema>;
export type BuildUsageQuery = z.infer<typeof buildUsageQuerySchema>;
export type RecommendedBuild = z.infer<typeof recommendedBuildSchema>;
export type BuildAdvice = z.infer<typeof buildAdviceSchema>;
export type BuildHistoryEntry = z.infer<typeof buildHistoryEntrySchema>;
export type BuildHistory = z.infer<typeof buildHistorySchema>;
export type BuildsCatalogQuery = z.infer<typeof buildsCatalogQuerySchema>;
export type BuildsCatalogEntry = z.infer<typeof buildsCatalogEntrySchema>;
export type BuildsCatalog = z.infer<typeof buildsCatalogSchema>;
export type ModuleSlot = z.infer<typeof moduleSlotSchema>;
