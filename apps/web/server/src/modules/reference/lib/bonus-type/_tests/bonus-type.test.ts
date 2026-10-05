import { COMPETITION_MODES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { bonusTypesOfMode, gameModeOfBonusType } from '../bonus-type';
import { ARENA_BONUS_TYPE, GAME_MODE_BONUS_TYPES } from '../bonus-type.constants';

describe('gameModeOfBonusType', () => {
  it('maps every bonus type of a mode back to that mode', () => {
    for (const mode of COMPETITION_MODES) {
      for (const type of bonusTypesOfMode(mode)) {
        expect(gameModeOfBonusType(type)).toBe(mode);
      }
    }
  });

  it('counts grand battles as random and both Steel Hunter formats as one mode', () => {
    expect(gameModeOfBonusType(String(ARENA_BONUS_TYPE.epicRandom))).toBe('random');
    expect(gameModeOfBonusType(String(ARENA_BONUS_TYPE.battleRoyaleSquad))).toBe('steelHunter');
  });

  it('ignores training rooms and unknown types', () => {
    expect(gameModeOfBonusType('2')).toBeNull();
    expect(gameModeOfBonusType('')).toBeNull();
  });

  it('never assigns one bonus type to two modes', () => {
    const all = Object.values(GAME_MODE_BONUS_TYPES).flat();

    expect(new Set(all).size).toBe(all.length);
  });
});
