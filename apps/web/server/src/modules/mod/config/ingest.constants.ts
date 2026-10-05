import { GAME_MODE_BONUS_TYPES } from '../../reference';

export const MOD_INGEST = {
  ledgerPrefix: 'mod:event:',
  ledgerTtlSeconds: 30 * 86_400,
  throttle: { limit: 120, ttl: 60_000 },
  battleUniqueConstraint: 'battle_account_id_arena_unique_id_key',
  maxFutureSeconds: 600
} as const;

export const BATTLE_CORROBORATION = {
  windowHours: 72,
  collectorBattleTypes: GAME_MODE_BONUS_TYPES.random.map(String)
} as const;
