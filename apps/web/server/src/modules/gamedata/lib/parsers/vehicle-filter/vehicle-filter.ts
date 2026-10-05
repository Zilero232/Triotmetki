import type { VehicleFilter, VehicleFilterRule } from '@otmetki/gamedata';

import type { XmlValue } from '../../xml/xml.types';
import type { MatchesRuleInput, MatchesVehicleFilterInput } from './vehicle-filter.types';

import { node, nodes, num, words } from '../../xml/xml';

const parseRules = (value: XmlValue | undefined): VehicleFilterRule[] => {
  const section = node(value);

  if (!section) {
    return [];
  }

  const nations = words(section.nations);
  const vehicles = nodes(section.vehicle);

  if (vehicles.length === 0) {
    return nations.length > 0 ? [{ tags: [], mandatoryTags: [], nations }] : [];
  }

  return vehicles.map((vehicle) => ({
    minLevel: num(vehicle.minLevel),
    maxLevel: num(vehicle.maxLevel),
    tags: words(vehicle.tags),
    mandatoryTags: words(vehicle.mandatoryTags),
    nations
  }));
};

export const parseVehicleFilter = (value: XmlValue | undefined): VehicleFilter => {
  const filter = node(value);

  return { include: parseRules(filter?.include), exclude: parseRules(filter?.exclude) };
};

const matchesRule = ({ rule, vehicle }: MatchesRuleInput): boolean =>
  (rule.nations.length === 0 || rule.nations.includes(vehicle.nation)) &&
  (rule.minLevel === undefined || vehicle.tier >= rule.minLevel) &&
  (rule.maxLevel === undefined || vehicle.tier <= rule.maxLevel) &&
  (rule.tags.length === 0 || rule.tags.some((tag) => vehicle.tags.includes(tag))) &&
  rule.mandatoryTags.every((tag) => vehicle.tags.includes(tag));

export const matchesVehicleFilter = ({ filter, vehicle }: MatchesVehicleFilterInput): boolean =>
  (filter.include.length === 0 || filter.include.some((rule) => matchesRule({ rule, vehicle }))) &&
  !filter.exclude.some((rule) => matchesRule({ rule, vehicle }));
