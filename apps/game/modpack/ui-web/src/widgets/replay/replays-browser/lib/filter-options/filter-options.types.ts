import type { BattleType, REPLAY_FILTER, ReplayFacets, ReplayFilters, ReplayNation, ReplaySort } from '@/entities/replay/replay';

import type { ReplaysText } from '../replays-text';

export type FilterOption<Value> = { value: Value; label: string; hint?: string };

export type FacetOptions = {
  maps: FilterOption<string | null>[];
  vehicles: FilterOption<string | null>[];
  nations: FilterOption<ReplayNation | null>[];
  tiers: FilterOption<number | null>[];
  types: FilterOption<BattleType | null>[];
  periods: FilterOption<ReplayFilters['period']>[];
};

export type ResultOption = FilterOption<NonNullable<ReplayFilters['result']> | typeof REPLAY_FILTER.all>;

export type SortOption = FilterOption<ReplaySort>;

export type FilterOptionsInput = { facets: ReplayFacets; t: ReplaysText };
