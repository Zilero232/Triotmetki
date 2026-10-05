import type { ExpectedValuesTable, TankReferenceTable, TankTiers } from '@otmetki/ratings';

import type { playerRatingsQueries } from './providers/player-ratings-queries.provider';

export type ReferenceTables = {
  expected: ExpectedValuesTable;
  tiers: TankTiers;
  references: TankReferenceTable;
};

export type CachedTables = {
  tables: ReferenceTables;
  loadedAt: number;
};

export type PlayerRatingsQueries = typeof playerRatingsQueries;
