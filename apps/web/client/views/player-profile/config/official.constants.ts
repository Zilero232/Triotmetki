import type { OfficialRatingField } from '@otmetki/schemas';

export const OFFICIAL_CARD = {
  fields: ['winRate', 'avgDamage', 'battles', 'avgXp', 'survivalRate', 'globalRating'] satisfies OfficialRatingField[],
  percentFields: ['winRate', 'survivalRate', 'accuracy'] satisfies OfficialRatingField[],
  skeletonHeight: 280
} as const;
