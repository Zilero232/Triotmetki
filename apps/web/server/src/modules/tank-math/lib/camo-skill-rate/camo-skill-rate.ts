import type { CrewSkill } from '@otmetki/gamedata';

import { SPOTTING } from '@otmetki/gamedata';

import { TANK_MATH } from '../../config/tank-math.constants';

export const camoSkillRate = (skills: readonly CrewSkill[]): number =>
  skills.find((skill) => skill.name === TANK_MATH.camoSkill)?.params.find((param) => param.name === TANK_MATH.camoSkillParam)?.perLevel ??
  SPOTTING.camoSkillRate;
