import type { OfficialRank, OfficialRatingPeriod } from '@otmetki/schemas';

import { entries } from 'remeda';

import type { RatingAccount, RatingEntry } from '../../../../lib/lesta';
import type { AvailablePeriodsInput, OfficialFields } from './official-rating.types';

import { OFFICIAL_FIELD_TO_LESTA, OFFICIAL_PERIOD_TO_LESTA } from './official-rating.constants';

const positiveInt = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

export const toOfficialRank = (entry: RatingEntry | null | undefined): OfficialRank | null => {
  if (!entry) {
    return null;
  }

  return {
    value: entry.value,
    rank: positiveInt(entry.rank),
    rankDelta: typeof entry.rank_delta === 'number' && Number.isInteger(entry.rank_delta) ? entry.rank_delta : null
  };
};

export const toOfficialFields = (account: RatingAccount): OfficialFields =>
  Object.fromEntries(
    entries(OFFICIAL_FIELD_TO_LESTA).flatMap(([field, lestaField]) => {
      const rank = toOfficialRank(account[lestaField]);

      return rank && (rank.value !== null || rank.rank !== null) ? [[field, rank]] : [];
    })
  );

export const availablePeriods = ({ wanted, lestaTypes }: AvailablePeriodsInput): OfficialRatingPeriod[] => {
  const offered = new Set(lestaTypes);

  return wanted.filter((period) => offered.has(OFFICIAL_PERIOD_TO_LESTA[period]));
};
