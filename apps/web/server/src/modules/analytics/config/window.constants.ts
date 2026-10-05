export const ANALYTICS_WINDOW = {
  periodDays: { d30: 30, d90: 90, y1: 365, all: null },
  weekTrendMaxDays: 90,
  sessions: 12,
  rngMaxBattles: 3_000,
  tiltMaxBattles: 5_000
} as const;

export const ANALYTICS_SQL = {
  epoch: new Date(0),
  randomBattleType: '1',
  weekStartsOn: 'sunday'
} as const;
