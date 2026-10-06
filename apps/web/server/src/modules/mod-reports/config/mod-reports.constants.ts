export const MOD_REPORTS_API = {
  throttle: { limit: 3, ttl: 600_000 },
  dailyCap: 10,
  dailyWindowSeconds: 86_400,
  dailyKeyPrefix: 'otmetki:mod:reports:',
  ipContext: 'otmetki-mod-report:',
  keyDerivation: { digest: 'sha256', info: 'otmetki-mod-report-ip-key', bytes: 32 }
} as const;
