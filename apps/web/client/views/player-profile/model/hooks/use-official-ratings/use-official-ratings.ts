'use client';

import { useQuery } from '@tanstack/react-query';

import { playersControllerOfficialRatingsOptions } from '@/shared/api/query-options';

import { OFFICIAL_CARD } from '../../../config';
import { hasRecentHistory } from '../../../lib/has-recent-history';
import { useProfileContext } from '../../context';

export const useOfficialRatings = () => {
  const { accountId, profile } = useProfileContext();
  const percentFields: readonly string[] = OFFICIAL_CARD.percentFields;
  const isHistoryEmpty = !hasRecentHistory(profile.recent);

  const { data } = useQuery({ ...playersControllerOfficialRatingsOptions({ path: { id: accountId } }), enabled: isHistoryEmpty });

  const periods = (data?.periods ?? []).map(({ period, fields }) => ({
    period,
    cells: OFFICIAL_CARD.fields.flatMap((field) => {
      const entry = fields[field];

      return entry ? [{ field, isPercent: percentFields.includes(field), ...entry }] : [];
    })
  }));

  return { periods, isVisible: isHistoryEmpty && periods.length > 0 };
};
