export const PRISMA_POOL = {
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  maxLifetimeSeconds: 300,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
  allowExitOnIdle: false
} as const;

export const PRISMA_CODE = {
  uniqueViolation: 'P2002',
  notFound: 'P2025',
  transactionConflict: 'P2034'
} as const;

export const PRISMA_LOCK = {
  timeoutMs: 15_000,
  maxWaitMs: 5_000
} as const;

export const LIMIT_LOCK_SCOPE = {
  apiKeys: 'limit:api-keys',
  webhooks: 'limit:webhooks',
  overlays: 'limit:overlays',
  goals: 'limit:goals',
  replays: 'limit:replays',
  linkedAccounts: 'limit:linked-accounts',
  modDevices: 'limit:mod-devices'
} as const;

export const PRISMA_TIMEOUT = {
  apiStatementMs: 30_000
} as const;
