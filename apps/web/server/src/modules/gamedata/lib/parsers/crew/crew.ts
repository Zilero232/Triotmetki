import type { CrewData, CrewRole, CrewSkill, SkillParam } from '@otmetki/gamedata';

import { CREW_ROLES } from '@otmetki/gamedata';

import type { CollectParamsInput, ParseCrewInput } from './crew.types';

import { oneOf } from '../../guards/guards';
import { bool, entries, get, isXmlNode, localizationFallback, localizationKey, nodes, num, parseXml, scalars, text, words } from '../../xml/xml';
import { SINGLE_ON_VEHICLE_TAG, SKILL_NODE_KEYS } from './crew.constants';

const isRole = oneOf(CREW_ROLES);

export const parsePerks = (xml: string): Map<number, Record<string, number>> => {
  const perks = new Map<number, Record<string, number>>();

  for (const perk of nodes(parseXml(xml).perk)) {
    const id = num(perk.id);

    if (id === undefined) {
      continue;
    }

    const args: Record<string, number> = {};

    for (const arg of nodes(get({ value: perk, path: 'defaultBlockSettings/arg' }))) {
      const name = text(arg.argId);
      const value = num(arg.value);

      if (name && value !== undefined) {
        args[name] = value;
      }
    }

    perks.set(id, args);
  }

  return perks;
};

const collectParams = ({ skill, perkArgs }: CollectParamsInput): SkillParam[] => {
  const params = new Map<string, SkillParam>();

  for (const arg of nodes(get({ value: skill, path: `${SKILL_NODE_KEYS.ui}/descr/arg` }))) {
    const name = text(arg.paramName);
    const perLevel = num(arg.value);

    if (name && perLevel !== undefined) {
      params.set(name, { name, perLevel, situational: bool(arg.situationalParam) ?? false, measureType: text(arg.measureType) });
    }
  }

  for (const param of nodes(get({ value: skill, path: `${SKILL_NODE_KEYS.ui}/params/param` }))) {
    const name = text(param.name);
    const perLevel = num(param.value);

    if (name && perLevel !== undefined) {
      params.set(name, { ...params.get(name), name, perLevel, situational: bool(param.situationalParam) ?? false });
    }
  }

  for (const [name, perLevel] of Object.entries(perkArgs ?? {})) {
    params.set(name, { situational: false, ...params.get(name), name, perLevel });
  }

  return [...params.values()];
};

export const parseCrew = ({ tankmenXml, perksXml }: ParseCrewInput): CrewData => {
  const root = parseXml(tankmenXml);
  const perks = perksXml ? parsePerks(perksXml) : new Map<number, Record<string, number>>();

  const skills: CrewSkill[] = entries(root.skills).flatMap(([name, value]) => {
    if (!isXmlNode(value)) {
      return [];
    }

    const prefix = name.split('_')[0];
    const role = isRole(prefix) && name.includes('_') ? prefix : 'common';
    const vsePerk = num(value[SKILL_NODE_KEYS.vsePerk]);
    const extras = scalars(value);

    delete extras[SKILL_NODE_KEYS.vsePerk];
    delete extras[SKILL_NODE_KEYS.tags];

    return [
      {
        name,
        role,
        roles: role === 'common' ? [...CREW_ROLES] : [role],
        isCommon: role === 'common',
        typeName: text(get({ value, path: `${SKILL_NODE_KEYS.ui}/typeName` })),
        vsePerk,
        singleOnVehicle: words(value[SKILL_NODE_KEYS.tags]).includes(SINGLE_ON_VEHICLE_TAG),
        params: collectParams({ skill: value, perkArgs: vsePerk === undefined ? undefined : perks.get(vsePerk) }),
        extras
      }
    ];
  });

  const roles: CrewRole[] = entries(root.roles).flatMap(([role, value]) => {
    if (!isRole(role) || !isXmlNode(value)) {
      return [];
    }

    return [
      {
        role,
        nameKey: localizationKey(value.userString),
        displayName: localizationFallback(value.userString) ?? role,
        icon: text(value.icon),
        skills: skills.filter((skill) => skill.roles.includes(role)).map((skill) => skill.name)
      }
    ];
  });

  return { roles, skills };
};
