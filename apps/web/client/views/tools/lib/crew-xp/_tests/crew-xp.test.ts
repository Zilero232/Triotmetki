import { describe, expect, it } from 'vitest';

import type { CrewPlanInput } from '../crew-xp.types';

import { CREW_XP } from '../../../config';
import { crewMultiplier, crewPlan, skillLevelCost, skillTotalXp, xpToNextSkill } from '../crew-xp';

const NO_BONUSES = { premium: false, accelerated: false, reserve: false };

const BASE: CrewPlanInput = { skill: 1, percent: 0, xpPerBattle: 1_000, bonuses: NO_BONUSES, bookXp: 0 };

describe('skillLevelCost', () => {
  it('makes every next percent more expensive than the previous one', () => {
    expect(skillLevelCost({ level: 51, skill: 1 })).toBeGreaterThan(skillLevelCost({ level: 50, skill: 1 }));
  });
});

describe('skillTotalXp', () => {
  it('prices the first skill as the game does, summing levels 0 to 99', () => {
    expect(skillTotalXp(1)).toBe(210_064);
  });

  it('roughly doubles the price of the second skill', () => {
    expect(skillTotalXp(2)).toBe(420_133);
  });

  it('roughly doubles the price of the third skill again', () => {
    expect(skillTotalXp(3)).toBe(840_256);
  });
});

describe('xpToNextSkill', () => {
  it('costs the whole skill from zero percent', () => {
    expect(xpToNextSkill({ skill: 1, percent: 0 })).toBe(skillTotalXp(1));
  });

  it('leaves the priciest part for the second half', () => {
    expect(xpToNextSkill({ skill: 1, percent: 50 })).toBeGreaterThan(skillTotalXp(1) / 2);
  });

  it('costs only the step from 99 % to 100 % just before the skill is complete', () => {
    expect(xpToNextSkill({ skill: 1, percent: CREW_XP.maxLevel - 1 })).toBe(9_550);
  });
});

describe('crewMultiplier', () => {
  it('is neutral without bonuses', () => {
    expect(crewMultiplier(NO_BONUSES)).toBe(1);
  });

  it('stacks every enabled bonus', () => {
    const all = crewMultiplier({ premium: true, accelerated: true, reserve: true });

    expect(all).toBe(CREW_XP.bonuses.premium * CREW_XP.bonuses.accelerated * CREW_XP.bonuses.reserve);
  });
});

describe('crewPlan', () => {
  it('counts battles to finish the current skill', () => {
    expect(crewPlan(BASE).battles).toBe(Math.ceil(skillTotalXp(1) / BASE.xpPerBattle));
  });

  it('lets crew books cover the remaining experience', () => {
    expect(crewPlan({ ...BASE, bookXp: skillTotalXp(1) }).battles).toBe(0);
  });

  it('needs fewer battles with a premium account', () => {
    expect(crewPlan({ ...BASE, bonuses: { ...NO_BONUSES, premium: true } }).battles ?? 0).toBeLessThan(crewPlan(BASE).battles ?? 0);
  });

  it('cannot plan without experience per battle', () => {
    expect(crewPlan({ ...BASE, xpPerBattle: 0 }).battles).toBeNull();
  });

  it('lists the following skills in order', () => {
    expect(crewPlan(BASE).upcoming.map(({ skill }) => skill)).toEqual(
      Array.from({ length: CREW_XP.upcomingSkills }, (_, index) => BASE.skill + index + 1)
    );
  });
});
