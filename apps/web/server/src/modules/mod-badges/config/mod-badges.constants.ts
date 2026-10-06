export const MOD_BADGES_API = {
  readThrottle: { limit: 30, ttl: 60_000 },
  preferenceThrottle: { limit: 10, ttl: 60_000 },
  activeDays: 30
} as const;

export const MOD_BADGES_QUOTA = {
  distinctIdsPerDay: 3000,
  keyPrefix: 'otmetki:mod:badges:asked:',
  memberHexLength: 16,
  ttlSeconds: 2 * 24 * 60 * 60,
  refused: -1,
  script: [
    "if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[1]) then",
    '  return -1',
    'end',
    'for index = 3, #ARGV do',
    "  redis.call('SADD', KEYS[1], ARGV[index])",
    'end',
    "redis.call('EXPIRE', KEYS[1], ARGV[2])",
    "return redis.call('SCARD', KEYS[1])"
  ].join('\n')
} as const;
