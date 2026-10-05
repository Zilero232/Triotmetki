import type { OfficialRank, OfficialRatingField, OfficialRatingPeriod } from '@otmetki/schemas';

export type OfficialFields = Partial<Record<OfficialRatingField, OfficialRank>>;

export type AvailablePeriodsInput = {
  wanted: readonly OfficialRatingPeriod[];
  lestaTypes: readonly string[];
};
