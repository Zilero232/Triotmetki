export const WEBHOOK_DELIVERY = {
  maxAttempts: 6,
  backoffMs: 30_000,
  timeoutMs: 10_000,
  disableAfterFailures: 20,
  responseBodyMaxLength: 1_000,
  secretBytes: 32,
  blockedResponse: 'refused: the webhook host resolves to a non-public address',
  retiredEventResponse: 'skipped: the API no longer publishes this event',
  inactiveEndpointResponse: 'skipped: the endpoint is switched off',
  userAgent: 'Otmetki-Webhooks/1.0 (+https://triotmetki.ru)',
  deliveriesShown: 50,
  redriveAfterMinutes: 15,
  redriveBatch: 500
} as const;

export const WEBHOOK_URL = {
  protocol: 'https:',
  allowedRange: 'unicast',
  blockedHostSuffixes: ['.localhost', '.local', '.internal']
} as const;
