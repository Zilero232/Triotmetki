import type { CompetitionMode } from '@otmetki/schemas';

export const ARENA_BONUS_TYPE = {
  regular: 1,
  globalMap: 13,
  strongholdSkirmish: 20,
  strongholdAdvance: 21,
  ranked: 22,
  epicRandom: 24,
  epicBattle: 27,
  battleRoyaleSolo: 29,
  battleRoyaleSquad: 30,
  comp7: 43
} as const;

export const GAME_MODE_BONUS_TYPES = {
  random: [ARENA_BONUS_TYPE.regular, ARENA_BONUS_TYPE.epicRandom],
  ranked: [ARENA_BONUS_TYPE.ranked],
  frontline: [ARENA_BONUS_TYPE.epicBattle],
  onslaught: [ARENA_BONUS_TYPE.comp7],
  steelHunter: [ARENA_BONUS_TYPE.battleRoyaleSolo, ARENA_BONUS_TYPE.battleRoyaleSquad]
} as const satisfies Record<CompetitionMode, readonly number[]>;
