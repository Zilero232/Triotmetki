import type { ModeMetaQuery, MyModeStatsQuery, PlayMode } from '@otmetki/schemas';

import type { ModeTankAggregate } from '../../../generated';

export type ModeMetaInput = {
  mode: PlayMode;
  query: ModeMetaQuery;
};

export type MyModeStatsInput = {
  userId: string;
  query: MyModeStatsQuery;
};

export type ToModeTanksInput = {
  rows: ModeTankAggregate[];
  minBattles: number;
};
