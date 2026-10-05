import type { LEAGUE } from '../../config/leagues.constants';

export type LeagueMetric = (typeof LEAGUE.metrics)[number];

export type LeagueStats = {
  accountId: bigint;
  battles: number;
  damage: number;
  wn8Weighted: number;
  wn8Battles: number;
  marks: number;
};

export type RankLeagueInput = {
  stats: readonly LeagueStats[];
  metric: LeagueMetric;
  minBattles: number;
};

export type RankedEntry = {
  rank: number;
  accountId: bigint;
  battles: number;
  value: number | null;
};

export type LeagueValueInput = {
  stats: LeagueStats;
  metric: LeagueMetric;
};
