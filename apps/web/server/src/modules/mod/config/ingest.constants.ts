import { GAME_MODE_BONUS_TYPES } from '../../reference';

export const MOD_INGEST = {
  ledgerPrefix: 'mod:event:',
  ledgerTtlSeconds: 2 * 86_400,
  throttle: { limit: 120, ttl: 60_000 },
  battleUniqueConstraint: 'battle_account_id_arena_unique_id_key',
  maxFutureSeconds: 600,
  arenaUniqueId: { maxDigits: 19, max: 9_223_372_036_854_775_807n }
} as const;

export const MOD_INGEST_QUOTA = {
  eventsPerDay: 5_000,
  newBattlesPerDay: 300,
  keyPrefix: 'mod:quota:',
  ttlSeconds: 2 * 86_400,
  refused: -1,
  script: [
    "local total = tonumber(redis.call('GET', KEYS[1]) or '0') + tonumber(ARGV[1])",
    'if total > tonumber(ARGV[2]) then',
    '  return -1',
    'end',
    "redis.call('INCRBY', KEYS[1], ARGV[1])",
    "redis.call('EXPIRE', KEYS[1], ARGV[3])",
    'return total'
  ].join('\n')
} as const;

export const BATTLE_CORROBORATION = {
  windowHours: 72,
  collectorBattleTypes: GAME_MODE_BONUS_TYPES.random.map(String)
} as const;
