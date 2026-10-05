import type { ReplayFilters, ReplayItem } from '../../model/schemas';

export type FilterReplaysInput = {
  items: readonly ReplayItem[];
  filters: ReplayFilters;
  now: number;
};

export type MatchReplayInput = {
  item: ReplayItem;
  filters: ReplayFilters;
  now: number;
};

export type MatchChoiceInput<Value> = {
  chosen: Value | null;
  actual: Value | null;
};
