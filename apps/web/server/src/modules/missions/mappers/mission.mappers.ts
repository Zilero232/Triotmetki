import type {
  MissionBranch as MissionBranchView,
  MissionCampaign as MissionCampaignView,
  MissionCondition,
  MissionOperationSummary,
  MissionProgressItem,
  Mission as MissionView
} from '@otmetki/schemas';

import type { Mission, Prisma, UserMissionProgress } from '../../../../generated';
import type { BranchViewInput, CampaignViewInput, OperationSummaryInput, StoredCondition } from './mission.types';

import { MISSION_CONDITION } from '../config/conditions.constants';
import { storedConditionsSchema } from '../dto/missions.schemas';
import { conditionMetric, missionMetric } from '../lib/condition-metrics/condition-metrics';
import { vehicleTypesOf } from '../lib/eligibility/eligibility';

export const readConditions = (value: Prisma.JsonValue): StoredCondition[] => {
  const parsed = storedConditionsSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

export const toConditionView = (condition: StoredCondition): MissionCondition => ({
  progressId: condition.progressId,
  isMain: condition.isMain,
  isAward: condition.isAward,
  isHeader: condition.display === MISSION_CONDITION.headerDisplay,
  icon: condition.icon,
  goal: condition.goal,
  title: condition.title,
  description: condition.description,
  metric: conditionMetric(condition.progressId)
});

export const toMissionView = (mission: Mission): MissionView => {
  const conditions = readConditions(mission.conditions).map(toConditionView);

  return {
    questId: mission.questId,
    name: mission.name,
    campaignId: mission.campaignId,
    operationId: mission.operationId,
    chainId: mission.chainId,
    position: mission.position,
    title: mission.title,
    shortTitle: mission.shortTitle,
    description: mission.description,
    advice: mission.advice,
    minTier: mission.minTier,
    maxTier: mission.maxTier,
    vehicleTypes: vehicleTypesOf(mission.vehicleClasses),
    isInitial: mission.isInitial,
    isFinal: mission.isFinal,
    hasHonors: mission.hasHonors,
    requiredUnlocks: mission.requiredUnlocks,
    metric: missionMetric(conditions).metric,
    conditions
  };
};

export const toBranchView = ({ branch, missions }: BranchViewInput): MissionBranchView => ({
  chainId: branch.chainId,
  kind: branch.kind,
  key: branch.key,
  vehicleType: branch.kind === 'vehicleClass' ? (vehicleTypesOf([branch.key])[0] ?? null) : null,
  nations: branch.nations,
  minTier: branch.minTier,
  maxTier: branch.maxTier,
  missions: [...missions].sort((a, b) => a.position - b.position).map(toMissionView)
});

export const toOperationSummary = ({ operation, reward, branchesCount, questIds }: OperationSummaryInput): MissionOperationSummary => ({
  operationId: operation.operationId,
  campaignId: operation.campaignId,
  name: operation.name ?? reward?.name ?? `#${operation.operationId}`,
  description: operation.description,
  reward,
  branchesCount,
  missionsCount: questIds.length,
  questIds: [...questIds],
  chainsToUnlockNext: operation.chainsToUnlockNext,
  nextOperationIds: operation.nextOperationIds
});

export const toCampaignView = ({ campaign, reward }: CampaignViewInput): Omit<MissionCampaignView, 'operations'> => ({
  campaignId: campaign.campaignId,
  branch: campaign.branch,
  name: campaign.name,
  description: campaign.description,
  reward
});

export const toProgressItem = (row: UserMissionProgress): MissionProgressItem => ({
  questId: row.questId,
  done: row.done,
  honors: row.honors,
  source: row.source,
  updatedAt: row.updatedAt.toISOString()
});
