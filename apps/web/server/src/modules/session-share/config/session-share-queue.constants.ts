export const SESSION_SHARE_QUEUE = {
  name: 'session-share',
  jobs: { send: 'send' },
  concurrency: 4,
  attempts: 3,
  backoffMs: 30_000
} as const;
