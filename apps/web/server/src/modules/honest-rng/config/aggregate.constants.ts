import { BATTLE_CORROBORATION } from '../../mod';

export const RNG_PERIODS = ['d7', 'd30', 'all'] as const;

export const HONEST_RNG_AGGREGATE = {
  periodDays: { d7: 7, d30: 30, all: null },
  chunk: 2000,
  settleHours: BATTLE_CORROBORATION.windowHours + 1,
  watermarkKey: 'honest-rng-watermark',
  scopes: { server: 'server', tier: 'tier', shell: 'shell' },
  cacheKey: 'honest-rng:view:v1',
  cacheSeconds: 600
} as const;

export const RNG_BATTLES_QUERIES = Symbol('RNG_BATTLES_QUERIES');
