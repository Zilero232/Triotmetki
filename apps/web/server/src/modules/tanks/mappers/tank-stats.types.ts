import type { ServerPeriod, SkillCohort, StatsMode, VehicleSummary } from '@otmetki/schemas';

import type { TankServerStats } from '../../../../generated';

export type ServerStatsRowInput = {
  row: TankServerStats;
  vehicle: VehicleSummary;
  period: ServerPeriod;
  cohort: SkillCohort;
  mode: StatsMode;
};
