import { parseAsStringLiteral } from 'nuqs/server';

export const RNG_PERIODS = ['d7', 'd30', 'all'] as const;

export const RNG_PERIOD_PARSER = parseAsStringLiteral(RNG_PERIODS).withDefault('d30').withOptions({ history: 'replace' });

export const HONEST_RNG_VIEW = {
  chartHeight: 260,
  percentScale: 100,
  labelDigits: 1,
  staleMs: 5 * 60_000
} as const;

export const RNG_SHELLS = ['armor_piercing', 'armor_piercing_cr', 'hollow_charge'] as const;

export type RngShell = (typeof RNG_SHELLS)[number];

export const RNG_LUCK_TONES = {
  lucky: 'good',
  even: 'steel',
  unlucky: 'bad',
  unknown: 'steel'
} as const;
