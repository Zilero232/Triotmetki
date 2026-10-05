import type { z } from 'zod';

import type { MISSION_GARAGE_STATES } from './missions.constants';
import type {
  missionBranchSchema,
  missionCampaignSchema,
  missionCampaignsSchema,
  missionConditionSchema,
  missionGarageSchema,
  missionGarageTankSchema,
  missionMetricSchema,
  missionOperationParamsSchema,
  missionOperationSchema,
  missionOperationSummarySchema,
  missionPlanSchema,
  missionPlanStepSchema,
  missionProgressItemSchema,
  missionProgressSchema,
  missionSchema,
  missionTankSchema,
  missionTanksQuerySchema,
  missionTanksSchema,
  updateMissionProgressSchema
} from './missions.schemas';

export type MissionMetric = z.infer<typeof missionMetricSchema>;
export type MissionGarageState = (typeof MISSION_GARAGE_STATES)[number];
export type MissionCondition = z.infer<typeof missionConditionSchema>;
export type MissionOperationSummary = z.infer<typeof missionOperationSummarySchema>;
export type MissionCampaign = z.infer<typeof missionCampaignSchema>;
export type MissionCampaigns = z.infer<typeof missionCampaignsSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type MissionBranch = z.infer<typeof missionBranchSchema>;
export type MissionOperation = z.infer<typeof missionOperationSchema>;
export type MissionOperationParams = z.infer<typeof missionOperationParamsSchema>;
export type MissionTanksQuery = z.infer<typeof missionTanksQuerySchema>;
export type MissionTank = z.infer<typeof missionTankSchema>;
export type MissionTanks = z.infer<typeof missionTanksSchema>;
export type MissionGarageTank = z.infer<typeof missionGarageTankSchema>;
export type MissionGarage = z.infer<typeof missionGarageSchema>;
export type MissionProgressItem = z.infer<typeof missionProgressItemSchema>;
export type MissionProgress = z.infer<typeof missionProgressSchema>;
export type UpdateMissionProgressInput = z.infer<typeof updateMissionProgressSchema>;
export type MissionPlanStep = z.infer<typeof missionPlanStepSchema>;
export type MissionPlan = z.infer<typeof missionPlanSchema>;
