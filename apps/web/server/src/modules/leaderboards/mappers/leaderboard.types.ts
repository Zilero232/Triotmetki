import type { RatingKind } from '@otmetki/schemas';

import type { RankedRow } from '../queries/leaderboard.types';

export type ToLeaderboardEntryInput = {
  row: RankedRow;
  rank: number;
  scale: RatingKind | null;
};
