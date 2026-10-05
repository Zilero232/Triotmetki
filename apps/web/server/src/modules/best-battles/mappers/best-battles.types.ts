import type { VehicleSummary } from '@otmetki/schemas';

import type { BestBattle, BestBattlePeriod } from '../best-battles.types';
import type { RankedBattleRow } from '../lib/feed-merge/feed-merge.types';
import type { BestBattlesQueries } from '../queries/best-battles.types';

export type BestBattleMedal = BestBattle['medals'][number];

export type BestBattleLookups = {
  vehicles: ReadonlyMap<number, VehicleSummary>;
  arenas: ReadonlyMap<string, string>;
  medals: ReadonlyMap<string, BestBattleMedal>;
};

export type ToBestBattleInput = BestBattleLookups & {
  row: RankedBattleRow;
};

export type ToMedalInput = Pick<BestBattleLookups, 'medals'> & {
  name: string;
};

export type ToArenaInput = Pick<BestBattleLookups, 'arenas'> & {
  arenaId: string | null;
  fallback: string | null;
};

export type FacetCounts = Awaited<ReturnType<BestBattlesQueries['facetCounts']>>;

export type ToFacetsInput = {
  counts: FacetCounts;
  lookups: BestBattleLookups;
  period: BestBattlePeriod;
  since: Date;
  now: Date;
};
