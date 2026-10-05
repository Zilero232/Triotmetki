import type { AnalyticsBattlesQuery, AnalyticsPeriod, AnalyticsQuery, AnalyticsTankQuery, PlaylistQuery, StatLine } from '@otmetki/schemas';

export type AccountInput = {
  userId: string;
  account?: number;
};

export type AnalyticsInput = AccountInput & AnalyticsQuery;

export type TankAnalyticsInput = AccountInput &
  AnalyticsTankQuery & {
    tankId: number;
  };

export type BattlesInput = AccountInput & AnalyticsBattlesQuery;

export type BattleInput = {
  userId: string;
  id: string;
};

export type PlaylistInput = AccountInput & PlaylistQuery;

export type PlaytimeWindowInput = {
  accountId: bigint;
  from: Date | null;
  hasModBattles: boolean;
};

export type PeriodWindow = {
  accountId: bigint;
  period: AnalyticsPeriod;
  from: Date | null;
};

export type TakenInput = {
  accountId: bigint;
  since: Date;
};

export type SessionsInput = {
  window: PeriodWindow;
  totals: StatLine;
};
