import { MODE_META } from '@otmetki/schemas';

export const MODE_META_AGGREGATE = {
  windowDays: MODE_META.windowDays,
  minBattles: 5,
  survivalScale: 'numeric(2, 1)'
} as const;
