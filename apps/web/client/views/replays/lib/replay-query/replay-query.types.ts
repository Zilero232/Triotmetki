import type { Nation, TankClass } from '@otmetki/icons';
import type { ReplayTag } from '@otmetki/schemas';

import type { REPLAY_MINIMUMS, REPLAY_RESULTS, REPLAY_SORTS } from '../../config';

export type ReplaySort = (typeof REPLAY_SORTS)[number];

export type ReplayResult = (typeof REPLAY_RESULTS)[number];

export type ReplayMinimum = (typeof REPLAY_MINIMUMS)[number];

export type ReplayFilters = Record<ReplayMinimum, number | null> & {
  tank: number | null;
  map: string | null;
  mode: string | null;
  player: string;
  clan: string;
  result: ReplayResult | null;
  tiers: number[];
  types: TankClass[];
  nations: Nation[];
  mastery: number | null;
  version: string | null;
  tags: ReplayTag[];
  sort: ReplaySort;
};

export type ToSearchQueryInput = {
  filters: ReplayFilters;
  limit: number;
};
