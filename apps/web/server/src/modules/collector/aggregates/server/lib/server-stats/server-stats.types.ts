import type { ServerStatsPeriod, StatsMode, TankServerStats } from '../../../../../../../generated';

export type DailyStatsRow = {
  tankId: number;
  cohort: string;
  samples: number;
  battles: number;
  wins: number;
  damage: number;
  frags: number;
  spotted: number;
  xp: number;
  blocked: number;
  survived: number;
  hits: number;
  shots: number;
  playerWins: number;
};

export type PlayerCountRow = {
  tankId: number;
  cohort: string;
  players: number;
};

export type PeriodPlayersAtInput = {
  rows: readonly { tankId: number; cohort: string; players: readonly number[] }[];
  index: number;
};

export type BuildServerStatsInput = {
  rows: readonly DailyStatsRow[];
  players: readonly PlayerCountRow[];
  tiers: ReadonlyMap<number, number>;
  mode: StatsMode;
  period: ServerStatsPeriod;
};

export type ServerStatsRow = Omit<TankServerStats, 'computedAt'>;
