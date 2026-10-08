export const MOD_BADGES_API = {
  readThrottle: { limit: 30, ttl: 60_000 },
  preferenceThrottle: { limit: 10, ttl: 60_000 },
  presenceThrottle: { limit: 30, ttl: 60_000 },
  activeDays: 30
} as const;

export const MOD_BADGES_QUOTA = {
  distinctIdsPerDay: 1500,
  ownIdsPerDay: 5,
  keyPrefix: 'otmetki:mod:badges:asked:',
  ownKeyPrefix: 'otmetki:mod:badges:own:',
  memberHexLength: 16,
  ttlSeconds: 2 * 24 * 60 * 60,
  refused: -1,
  script: [
    'local limit = tonumber(ARGV[1])',
    'local members = {}',
    'for index = 3, #ARGV do',
    '  members[#members + 1] = ARGV[index]',
    'end',
    'if #members == 0 then',
    '  return 0',
    'end',
    'for _, key in ipairs(KEYS) do',
    "  local known = redis.call('SMISMEMBER', key, unpack(members))",
    '  local fresh = 0',
    '  for _, isKnown in ipairs(known) do',
    '    if isKnown == 0 then',
    '      fresh = fresh + 1',
    '    end',
    '  end',
    "  if fresh > 0 and redis.call('SCARD', key) + fresh > limit then",
    '    return -1',
    '  end',
    'end',
    'for _, key in ipairs(KEYS) do',
    "  redis.call('SADD', key, unpack(members))",
    "  redis.call('EXPIRE', key, ARGV[2])",
    'end',
    'return 0'
  ].join('\n')
} as const;
