import { MOE } from '@otmetki/ratings';

export const MOE_ESTIMATE = {
  randomBattleType: '1',
  percents: { p65: MOE.markPercents[0], p85: MOE.markPercents[1], p95: MOE.markPercents[2], p100: MOE.maxPercent }
} as const;
