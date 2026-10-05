import type { CrewSkill } from '@otmetki/gamedata';

import { SPOTTING } from '@otmetki/gamedata';
import { describe, expect, it } from 'vitest';

import { TANK_MATH } from '../../../config/tank-math.constants';
import { camoSkillRate } from '../camo-skill-rate';

const skill = (perLevel: number): CrewSkill => ({
  name: TANK_MATH.camoSkill,
  role: 'common',
  roles: ['commander'],
  isCommon: true,
  singleOnVehicle: false,
  params: [{ name: TANK_MATH.camoSkillParam, perLevel, situational: false }],
  extras: {}
});

describe('camoSkillRate', () => {
  it('reads the per-level rate of the camouflage skill from the game data', () => {
    expect(camoSkillRate([skill(SPOTTING.camoSkillRate * 2)])).toBe(SPOTTING.camoSkillRate * 2);
  });

  it('falls back to the published rate when the skill is missing', () => {
    expect(camoSkillRate([])).toBe(SPOTTING.camoSkillRate);
  });
});
