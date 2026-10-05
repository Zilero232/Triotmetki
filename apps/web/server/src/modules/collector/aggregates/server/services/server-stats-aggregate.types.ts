import type { ServerStatsPeriod, StatsMode } from '../../../../../../generated';
import type { ServerStatsRow } from '../lib/server-stats';

export type WritePeriodInput = {
  stats: readonly ServerStatsRow[];
  mode: StatsMode;
  period: ServerStatsPeriod;
  now: Date;
};
