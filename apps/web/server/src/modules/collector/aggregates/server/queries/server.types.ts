import type { Database } from '../../../../../core';
import type { SERVER_STATS_AGGREGATE } from '../config/server.constants';

type ServerStatsMode = (typeof SERVER_STATS_AGGREGATE.modes)[number];

export type ServerPlayersInput = {
  db: Database;
  mode: ServerStatsMode;
  sinces: readonly Date[];
  until: Date;
};

export type DailyStatsInput = {
  db: Database;
  mode: ServerStatsMode;
  since: Date;
  until: Date;
};

export type PromotePinnedInput = {
  db: Database;
  now: Date;
};

export type DemoteIdleInput = {
  db: Database;
  idleSince: Date;
};
