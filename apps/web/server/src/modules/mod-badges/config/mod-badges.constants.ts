export const MOD_BADGES_API = {
  readThrottle: { limit: 30, ttl: 60_000 },
  preferenceThrottle: { limit: 10, ttl: 60_000 },
  activeDays: 30
} as const;
