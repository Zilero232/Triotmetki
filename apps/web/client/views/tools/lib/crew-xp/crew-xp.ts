import { range, sumBy, times } from 'remeda';

import type { CrewPlan, CrewPlanInput, SkillLevelCostInput, XpToNextSkillInput } from './crew-xp.types';

import { CREW_BONUSES, CREW_XP } from '../../config';
import { battlesFor } from '../research-plan';

const LEVELS = range(0, CREW_XP.maxLevel);

export const skillLevelCost = ({ level, skill }: SkillLevelCostInput): number => {
  const levelXp = CREW_XP.levelBase * CREW_XP.levelGrowth ** (level / CREW_XP.maxLevel);

  return Math.round(levelXp * 2 ** skill);
};

export const skillTotalXp = (skill: number): number => sumBy(LEVELS, (level) => skillLevelCost({ level, skill }));

export const xpToNextSkill = ({ skill, percent }: XpToNextSkillInput): number =>
  sumBy(
    LEVELS.filter((level) => level >= Math.floor(percent)),
    (level) => skillLevelCost({ level, skill })
  );

export const crewMultiplier = (bonuses: CrewPlanInput['bonuses']): number =>
  CREW_BONUSES.reduce((multiplier, bonus) => (bonuses[bonus] ? multiplier * CREW_XP.bonuses[bonus] : multiplier), 1);

export const crewPlan = ({ skill, percent, xpPerBattle, bonuses, bookXp }: CrewPlanInput): CrewPlan => {
  const perBattle = xpPerBattle * crewMultiplier(bonuses);
  const xpLeft = Math.max(0, xpToNextSkill({ skill, percent }) - bookXp);

  return {
    perBattle,
    xpLeft,
    battles: battlesFor({ left: xpLeft, perBattle }),
    upcoming: times(CREW_XP.upcomingSkills, (index) => {
      const next = skill + index + 1;
      const xp = skillTotalXp(next);

      return { skill: next, xp, battles: battlesFor({ left: xp, perBattle }) };
    })
  };
};
