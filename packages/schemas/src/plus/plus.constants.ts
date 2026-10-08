export const PLUS = {
  checkoutEnabled: false
} as const;

export const PLUS_FEATURES = [
  'analytics',
  'mapAdvisor',
  'battleAnalysis',
  'priorityPolling',
  'progression',
  'overlays',
  'cosmetics',
  'analyticsExport',
  'apiLimits',
  'privateCompetitions',
  'streamerAlerts',
  'supertest',
  'armor3d'
] as const;

export const PLUS_LIMITS = {
  linkedAccounts: { free: 2, plus: 10 },
  goals: { free: 3, plus: 10 },
  watchedTanks: { free: 10, plus: 300 },
  watchedPlayers: { free: 10, plus: 100 },
  overlays: { free: 2, plus: 20 },
  storedReplays: { free: 50, plus: 1_000 },
  streamerFollows: { free: 3, plus: 200 },
  historyDays: { free: 90, plus: null }
} as const;

export const PLUS_GRACE = {
  pastDueDays: 3,
  overflowReadOnlyDays: 180
} as const;

export const PLUS_TRIAL = {
  days: 7,
  referralDays: 14
} as const;

export const PLUS_STATES = ['none', 'trial', 'active', 'grace', 'expired'] as const;
