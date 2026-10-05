import type * as z from 'zod/mini';

import type { REPLAY_FILTER, REPLAYS } from '../../config';
import type { replaysPageSchema } from './replays.schemas';

export type ReplayItem = ReplaysPage['items'][number];

export type ReplaysPage = z.infer<typeof replaysPageSchema>;

type ReplayResult = (typeof REPLAYS.results)[number];

export type BattleType = (typeof REPLAYS.battleTypes)[number];

export type ReplayNation = (typeof REPLAYS.nations)[number];

type ReplayPeriod = (typeof REPLAY_FILTER.periods)[number];

export type ReplaySort = (typeof REPLAY_FILTER.sorts)[number];

export type ReplayFilters = {
  query: string;
  result: ReplayResult | null;
  map: string | null;
  vehicle: string | null;
  nation: ReplayNation | null;
  tier: number | null;
  type: BattleType | null;
  period: ReplayPeriod;
  favourites: boolean;
  sort: ReplaySort;
  descending: boolean;
};
