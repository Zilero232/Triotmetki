import type { CompetitionMode } from '@otmetki/schemas';

import { entries } from 'remeda';

import { GAME_MODE_BONUS_TYPES } from './bonus-type.constants';

const MODE_BY_BONUS_TYPE = new Map<string, CompetitionMode>(
  entries(GAME_MODE_BONUS_TYPES).flatMap(([mode, types]) => types.map((type) => [String(type), mode] as const))
);

export const gameModeOfBonusType = (bonusType: string): CompetitionMode | null => MODE_BY_BONUS_TYPE.get(bonusType) ?? null;

export const bonusTypesOfMode = (mode: CompetitionMode): string[] => GAME_MODE_BONUS_TYPES[mode].map(String);
