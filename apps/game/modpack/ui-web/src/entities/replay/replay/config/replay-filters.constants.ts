import type { ReplayFilters } from '../model/schemas';

import { REPLAY_FILTER } from './replays.constants';

export const DEFAULT_REPLAY_FILTERS = {
  query: '',
  result: null,
  map: null,
  vehicle: null,
  nation: null,
  tier: null,
  type: null,
  period: REPLAY_FILTER.all,
  favourites: false,
  sort: REPLAY_FILTER.defaultSort,
  descending: true
} as const satisfies ReplayFilters;
