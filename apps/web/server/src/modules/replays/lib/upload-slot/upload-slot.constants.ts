export const UPLOAD_SLOT_SCRIPTS = {
  claim: [
    "local taken = redis.call('INCR', KEYS[1])",
    "redis.call('EXPIRE', KEYS[1], ARGV[2])",
    'if taken > tonumber(ARGV[1]) then',
    "  redis.call('DECR', KEYS[1])",
    '  return 0',
    'end',
    'return 1'
  ].join('\n'),
  release: [
    "local taken = tonumber(redis.call('GET', KEYS[1]) or '0')",
    'if taken > 1 then',
    "  return redis.call('DECR', KEYS[1])",
    'end',
    "redis.call('DEL', KEYS[1])",
    'return 0'
  ].join('\n')
} as const;
