'use client';

import { useQuery } from '@tanstack/react-query';
import { sumBy } from 'remeda';

import { useAuthSession } from '@/entities/auth/session';
import { getMissionCampaigns, missionQueries } from '@/entities/mission/mission';
import { QUERY_KEYS } from '@/shared/constants';

import { operationProgress } from '../../../lib/operation-progress';

export const useMissionsHub = () => {
  const { data: session } = useAuthSession();
  const campaigns = useQuery({ queryKey: QUERY_KEYS.missions.campaigns, queryFn: ({ signal }) => getMissionCampaigns({ signal }) });
  const { data: progress } = useQuery(missionQueries.progress(Boolean(session)));

  const { data: hub } = campaigns;
  const isSignedIn = Boolean(session);
  const items = progress?.items ?? [];
  const operationsCount = sumBy(hub?.campaigns ?? [], (campaign) => campaign.operations.length);

  return {
    campaigns,
    operationsCount: operationsCount > 0 ? operationsCount : null,
    hasFigure: campaigns.isPending || campaigns.isError || operationsCount > 0,
    progressOf: (questIds: readonly number[]) => (isSignedIn ? operationProgress({ questIds, items }) : null)
  };
};
