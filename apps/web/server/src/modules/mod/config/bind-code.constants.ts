export const BIND_CODE = {
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  length: 10,
  ttlMinutes: 10,
  throttle: { limit: 10, ttl: 60_000 },
  failurePrefix: 'otmetki:mod:bind-failures:',
  accountFailurePrefix: 'otmetki:mod:bind-failures:account:',
  anyAccount: 'any',
  maxFailuresPerRequester: 10,
  maxFailuresPerAccount: 20,
  failureWindowSeconds: 900
} as const;
