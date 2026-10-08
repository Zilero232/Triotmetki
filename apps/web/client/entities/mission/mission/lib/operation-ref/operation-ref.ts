import type { MissionOperationRef, MissionOperationRouteParams } from './operation-ref.types';

import { OPERATION_REF } from './operation-ref.constants';

const routeId = (value: string): number | null => (OPERATION_REF.idPattern.test(value) ? Number(value) : null);

export const missionOperationRef = ({ campaign, operation }: MissionOperationRouteParams): MissionOperationRef | null => {
  const campaignId = routeId(campaign);
  const operationId = routeId(operation);

  if (campaignId === null || operationId === null) {
    return null;
  }

  return { campaign: campaignId, operation: operationId };
};
