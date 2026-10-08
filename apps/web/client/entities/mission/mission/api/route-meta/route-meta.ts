import { cacheLife } from 'next/cache';

import type { RouteMeta } from '@/shared/seo';

import { UNAVAILABLE_CACHE_LIFE } from '@/shared/api/query-client';
import { lookupRouteMeta, routeMeta } from '@/shared/seo/server';

import type { MissionOperationRef, MissionOperationRouteParams } from '../../lib/operation-ref';
import type { MissionOperationRouteMeta } from './route-meta.types';

import { missionOperationRef } from '../../lib/operation-ref';
import { getMissionCampaigns, getMissionOperation } from '../missions';

const lookupOperationMeta = async ({ campaign, operation }: MissionOperationRef) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const detail = await getMissionOperation({ campaign, operation });

    return { name: detail.operation.name, campaign, operation };
  });
};

export const missionOperationRouteMeta = async (params: MissionOperationRouteParams): Promise<RouteMeta<MissionOperationRouteMeta>> => {
  const ref = missionOperationRef(params);

  if (ref === null) {
    return { meta: null, isFound: false };
  }

  return routeMeta(lookupOperationMeta(ref));
};

export const missionOperationRefs = async (): Promise<MissionOperationRef[]> => {
  'use cache';

  try {
    const { campaigns } = await getMissionCampaigns({});

    return campaigns.flatMap(({ campaignId, operations }) => operations.map(({ operationId }) => ({ campaign: campaignId, operation: operationId })));
  } catch {
    cacheLife(UNAVAILABLE_CACHE_LIFE);

    return [];
  }
};
