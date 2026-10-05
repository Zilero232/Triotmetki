import { z } from 'zod';

import { serverPeriodSchema, skillCohortSchema } from '../common/period/period.schemas';
import { isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { tierSchema, vehicleSummarySchema, vehicleTypeSchema } from '../vehicles/vehicles.schemas';
import { MISSION_BRANCH_KINDS, MISSION_GARAGE_STATES, MISSION_METRICS, MISSION_PROGRESS_SOURCES, MISSION_TANKS_QUERY } from './missions.constants';

export const missionMetricSchema = z.enum(MISSION_METRICS);

const missionBranchKindSchema = z.enum(MISSION_BRANCH_KINDS);

const missionProgressSourceSchema = z.enum(MISSION_PROGRESS_SOURCES);

const missionIdSchema = z.coerce.number().int().positive();

export const missionConditionSchema = z.object({
  progressId: z.string(),
  isMain: z.boolean(),
  isAward: z.boolean(),
  isHeader: z.boolean(),
  icon: z.string().nullable(),
  goal: z.number().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  metric: missionMetricSchema.nullable()
});

export const missionOperationSummarySchema = z.object({
  operationId: z.number().int(),
  campaignId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  reward: vehicleSummarySchema.nullable(),
  branchesCount: z.number().int().nonnegative(),
  missionsCount: z.number().int().nonnegative(),
  questIds: z.array(z.number().int()),
  chainsToUnlockNext: z.number().int().nonnegative(),
  nextOperationIds: z.array(z.number().int())
});

export const missionCampaignSchema = z.object({
  campaignId: z.number().int(),
  branch: z.string().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  reward: vehicleSummarySchema.nullable(),
  operations: z.array(missionOperationSummarySchema)
});

export const missionCampaignsSchema = z.object({
  gameVersion: z.string().nullable(),
  campaigns: z.array(missionCampaignSchema)
});

export const missionSchema = z.object({
  questId: z.number().int(),
  name: z.string(),
  campaignId: z.number().int(),
  operationId: z.number().int(),
  chainId: z.number().int(),
  position: z.number().int(),
  title: z.string(),
  shortTitle: z.string().nullable(),
  description: z.string().nullable(),
  advice: z.string().nullable(),
  minTier: tierSchema,
  maxTier: tierSchema,
  vehicleTypes: z.array(vehicleTypeSchema),
  isInitial: z.boolean(),
  isFinal: z.boolean(),
  hasHonors: z.boolean(),
  requiredUnlocks: z.array(z.number().int()),
  metric: missionMetricSchema,
  conditions: z.array(missionConditionSchema)
});

export const missionBranchSchema = z.object({
  chainId: z.number().int(),
  kind: missionBranchKindSchema,
  key: z.string(),
  vehicleType: vehicleTypeSchema.nullable(),
  nations: z.array(z.string()),
  minTier: tierSchema,
  maxTier: tierSchema,
  missions: z.array(missionSchema)
});

export const missionOperationSchema = z.object({
  campaign: missionCampaignSchema.omit({ operations: true }),
  operation: missionOperationSummarySchema,
  branches: z.array(missionBranchSchema)
});

export const missionOperationParamsSchema = z.object({
  campaign: missionIdSchema,
  operation: missionIdSchema
});

export const missionParamsSchema = z.object({
  id: missionIdSchema
});

export const missionTanksQuerySchema = z.object({
  period: serverPeriodSchema.default(MISSION_TANKS_QUERY.defaultPeriod),
  limit: z.coerce.number().int().min(1).max(MISSION_TANKS_QUERY.maxLimit).default(MISSION_TANKS_QUERY.defaultLimit)
});

export const missionTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  value: z.number(),
  winRate: z.number(),
  battles: z.number().int().nonnegative(),
  score: z.number().min(0).max(100)
});

export const missionTanksSchema = z.object({
  questId: z.number().int(),
  metric: missionMetricSchema,
  progressId: z.string().nullable(),
  cohort: skillCohortSchema,
  period: serverPeriodSchema,
  generatedAt: isoDateTimeSchema.nullable(),
  tanks: z.array(missionTankSchema)
});

export const missionGarageTankSchema = missionTankSchema.extend({
  ownBattles: z.number().int().nonnegative(),
  ownWinRate: z.number().nullable()
});

export const missionGarageSchema = z.object({
  questId: z.number().int(),
  metric: missionMetricSchema,
  state: z.enum(MISSION_GARAGE_STATES),
  tanks: z.array(missionGarageTankSchema)
});

export const missionProgressItemSchema = z.object({
  questId: z.number().int(),
  done: z.boolean(),
  honors: z.boolean(),
  source: missionProgressSourceSchema,
  updatedAt: isoDateTimeSchema
});

export const missionProgressSchema = z.object({
  items: z.array(missionProgressItemSchema)
});

export const updateMissionProgressSchema = z.object({
  questId: z.number().int().positive(),
  done: z.boolean(),
  honors: z.boolean()
});

export const missionPlanQuerySchema = z.object({
  operation: missionIdSchema
});

export const missionPlanStepSchema = z.object({
  questId: z.number().int(),
  chainId: z.number().int(),
  branchKey: z.string(),
  title: z.string(),
  shortTitle: z.string().nullable(),
  withHonors: z.boolean(),
  tank: vehicleSummarySchema.nullable()
});

export const missionPlanSchema = z.object({
  operationId: z.number().int(),
  remaining: z.number().int().nonnegative(),
  steps: z.array(missionPlanStepSchema)
});
