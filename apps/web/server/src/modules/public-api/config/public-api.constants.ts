export const PUBLIC_API = {
  tagPrefix: 'v1-'
} as const;

export const API_RATE_LIMIT = {
  secondPrefix: 'otmetki:api:user-rps',
  secondWindow: 1,
  dayPrefix: 'otmetki:api:user-day',
  dayWindow: 86_400,
  failedKeys: {
    prefix: 'otmetki:api:failed-key',
    points: 30,
    duration: 60,
    unknownIp: 'unknown'
  },
  headers: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    dailyLimit: 'X-RateLimit-Daily-Limit',
    dailyRemaining: 'X-RateLimit-Daily-Remaining',
    retryAfter: 'Retry-After'
  }
} as const;

export const API_USAGE = {
  flushIntervalMs: 10_000,
  errorMessageMaxLength: 500,
  unmatchedEndpoint: 'unmatched'
} as const;
