import type { BuildUsage, Loadout } from '@otmetki/schemas';

import { LOADOUT } from '@otmetki/schemas';
import { firstBy, sortBy, sumBy } from 'remeda';

import type { CommonSkillEntry, TopIdsInput } from './recommend-loadout.types';

import { BUILD_SLOTS } from '../../config/provisions.constants';
import { RECOMMENDED_BUILD } from '../../config/recommended.constants';

const { minShare, maxSkillsPerRole, profileId, commonRole } = RECOMMENDED_BUILD;

const topIds = ({ picks, size, filled }: TopIdsInput): (number | null)[] =>
  Array.from({ length: size }, (_, index) => (index < filled ? (picks[index]?.option.id ?? null) : null));

const equipmentOf = (usage: BuildUsage): (number | null)[] => {
  const used = new Set<number>();

  return Array.from({ length: LOADOUT.equipmentSlots }, (_, slot) => {
    const pick = usage.equipment.find((entry) => entry.slot === slot)?.picks.find((candidate) => !used.has(candidate.option.id));

    if (!pick) {
      return null;
    }

    used.add(pick.option.id);

    return pick.option.id;
  });
};

const commonSkills = (usage: BuildUsage): string[] => {
  const members = sumBy(usage.crew, (role) => role.members);
  const entries = new Map<string, CommonSkillEntry>();

  for (const role of usage.crew) {
    for (const skill of role.skills.filter((entry) => entry.isCommon)) {
      const entry = entries.get(skill.skill) ?? { skill: skill.skill, weight: 0, positions: 0 };

      entry.weight += skill.share * role.members;
      entry.positions += skill.avgPosition * skill.share * role.members;
      entries.set(skill.skill, entry);
    }
  }

  const chosen = sortBy(
    [...entries.values()].filter((entry) => members > 0 && entry.weight / members >= minShare),
    [(entry) => entry.weight, 'desc']
  ).slice(0, maxSkillsPerRole);

  return sortBy(chosen, (entry) => entry.positions / entry.weight).map((entry) => entry.skill);
};

const crewSkillsOf = (usage: BuildUsage): Loadout['crewSkills'] => {
  const roles = usage.crew.flatMap((role) => {
    const skills = sortBy(
      role.skills.filter((skill) => !skill.isCommon && skill.share >= minShare),
      [(skill) => skill.share, 'desc']
    ).slice(0, maxSkillsPerRole);

    return skills.length > 0 ? [[role.role, sortBy(skills, (skill) => skill.avgPosition).map((skill) => skill.skill)] as const] : [];
  });

  const common = commonSkills(usage);

  return Object.fromEntries(common.length > 0 ? [[commonRole, common] as const, ...roles] : roles);
};

export const recommendLoadout = (usage: BuildUsage): Loadout | null => {
  if (!usage.isEnough) {
    return null;
  }

  return {
    profileId,
    equipment: equipmentOf(usage),
    consumables: topIds({ picks: usage.consumables, size: LOADOUT.consumableSlots, filled: LOADOUT.consumableSlots }),
    directives: topIds({ picks: usage.directives, size: LOADOUT.directiveSlots, filled: BUILD_SLOTS.directives }),
    ammo: usage.shells
      .slice(0, LOADOUT.ammoSlots)
      .map((shell) => ({ shellId: shell.shellId, count: Math.round(shell.avgCount) }))
      .filter((shell) => shell.count > 0),
    crewSkills: crewSkillsOf(usage),
    fieldModifications: usage.fieldModifications.flatMap((step) => {
      const best = firstBy(step.picks, [(pick) => pick.share, 'desc']);

      return best && best.share >= minShare ? [best.option.tag] : [];
    })
  };
};
