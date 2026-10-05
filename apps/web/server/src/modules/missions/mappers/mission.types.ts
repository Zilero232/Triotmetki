import type { VehicleSummary } from '@otmetki/schemas';
import type { z } from 'zod';

import type { Mission, MissionBranch, MissionCampaign, MissionOperation } from '../../../../generated';
import type { storedConditionSchema } from '../dto/missions.schemas';

export type StoredCondition = z.infer<typeof storedConditionSchema>;

export type OperationSummaryInput = {
  operation: MissionOperation;
  reward: VehicleSummary | null;
  branchesCount: number;
  questIds: readonly number[];
};

export type CampaignViewInput = {
  campaign: MissionCampaign;
  reward: VehicleSummary | null;
};

export type BranchViewInput = {
  branch: MissionBranch;
  missions: readonly Mission[];
};
