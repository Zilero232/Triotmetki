export const PREDICTIONS = {
  lockAfterSeconds: 120,
  startFreshSeconds: 180,
  maxOpenMinutes: 25,
  stateTtlSeconds: 3_600,
  stateKeyPrefix: 'otmetki:streamers:prediction:',
  openSetKey: 'otmetki:streamers:predictions:open',
  titleMaxLength: 45,
  outcomeMaxLength: 25,
  recentBattles: 20,
  thresholdStep: 100,
  minThreshold: 500,
  defaultThreshold: 2_000,
  failedJobsKept: 100
} as const;
