import type { BuildMode } from '@otmetki/schemas';

import { GAME_MODE_BONUS_TYPES } from '../../../../../reference';

export const BUILD_MODE_BONUS_TYPES = {
  random: GAME_MODE_BONUS_TYPES.random,
  ranked: GAME_MODE_BONUS_TYPES.ranked,
  frontline: GAME_MODE_BONUS_TYPES.frontline,
  onslaught: GAME_MODE_BONUS_TYPES.onslaught
} as const satisfies Record<BuildMode, readonly number[]>;

export const BUILD_USAGE_AGGREGATE = {
  maxBattlesPerTank: 20_000,
  cohortMinBattles: 30,
  cohortShares: { top10: 0.1, top1: 0.01 },
  maxPicks: 12,
  unknownVersion: 'unknown'
} as const;

export const BUILD_USAGE_SHARE = {
  digits: 4
} as const;
