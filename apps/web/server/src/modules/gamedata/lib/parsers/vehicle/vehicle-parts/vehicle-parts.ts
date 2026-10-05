import type { Armor, ModuleBase, PitchLimits, PitchPoint, RateOfFire, Unlock } from '@otmetki/gamedata';

import { chunk } from 'remeda';

import type { XmlNode, XmlValue } from '../../../xml/xml.types';
import type { ArmorExtras, ArmorExtrasInput, ModuleBaseInput, ResolveModuleInput, ResolvePrimaryArmorInput } from '../vehicle.types';

import { makeCompactDescr } from '../../../ids/ids';
import {
  entries,
  get,
  isXmlNode,
  list,
  localizationFallback,
  localizationKey,
  mergeNodes,
  node,
  num,
  nums,
  price,
  text,
  words
} from '../../../xml/xml';

export const resolveModule = ({ name, value, shared }: ResolveModuleInput): XmlNode => mergeNodes({ base: shared[name], override: node(value) });

const parseUnlocks = (value: XmlValue | undefined): Unlock[] =>
  entries(value).flatMap(([type, items]) =>
    list(items).flatMap((item) => {
      const name = text(item);

      if (!name) {
        return [];
      }

      const cost = isXmlNode(item) ? num(item.cost) : undefined;

      return [cost === undefined ? { type, name } : { type, name, cost }];
    })
  );

export const parseArmor = (value: XmlValue | undefined): Armor => {
  const armor: Armor = {};

  for (const [plate, thickness] of entries(value)) {
    const amount = num(thickness);

    if (amount !== undefined) {
      armor[plate] = amount;
    }
  }

  return armor;
};

export const parseSpacedArmor = (value: XmlValue | undefined): string[] =>
  entries(value).flatMap(([plate, thickness]) => {
    const container = node(thickness);
    const damageFactor = container ? num(container.vehicleDamageFactor) : undefined;

    return damageFactor === 0 && num(thickness) !== undefined ? [plate] : [];
  });

export const parseCollisionPiece = (value: XmlValue | undefined): string | undefined => {
  const path = text(get({ value, path: 'collisionModelClient' }));
  const file = path?.split('/').pop();

  return file ? file.replace(/\.model$/i, '') : undefined;
};

export const armorExtras = ({ armor, hitTester }: ArmorExtrasInput): ArmorExtras => {
  const spacedArmor = parseSpacedArmor(armor);
  const collision = parseCollisionPiece(hitTester);

  return { ...(spacedArmor.length > 0 ? { spacedArmor } : {}), ...(collision ? { collision } : {}) };
};

export const resolvePrimaryArmor = ({ armor, value }: ResolvePrimaryArmorInput): number[] => words(value).map((plate) => armor[plate] ?? 0);

export const parseModuleBase = ({ name, source, itemType, nationId }: ModuleBaseInput): ModuleBase => {
  const id = num(source.id) ?? -1;

  return {
    name,
    id,
    moduleId: id < 0 ? -1 : makeCompactDescr({ itemType, nationId, id }),
    nameKey: localizationKey(source.userString),
    displayName: localizationFallback(source.userString) ?? localizationFallback(name) ?? name,
    tier: num(source.level),
    price: price(source.price),
    weight: num(source.weight) ?? 0,
    maxHealth: num(source.maxHealth),
    tags: words(source.tags),
    unlocks: parseUnlocks(source.unlocks)
  };
};

const toPitchPoints = (value: XmlValue | undefined): PitchPoint[] => {
  const values = nums(value);

  if (values.length === 1) {
    return [
      { angle: 0, pitch: values[0] },
      { angle: 1, pitch: values[0] }
    ];
  }

  return chunk(values, 2).flatMap(([angle, pitch]) => (pitch === undefined ? [] : [{ angle, pitch }]));
};

export const parsePitchLimits = (value: XmlValue | undefined): PitchLimits | undefined => {
  const container = node(value);

  if (!container) {
    return undefined;
  }

  const minPitch = toPitchPoints(container.minPitch);
  const maxPitch = toPitchPoints(container.maxPitch);

  if (minPitch.length === 0 || maxPitch.length === 0) {
    return undefined;
  }

  return {
    elevation: -minPitch[0].pitch,
    depression: maxPitch[0].pitch,
    elevationMax: Math.max(...minPitch.map((point) => -point.pitch)),
    depressionMax: Math.max(...maxPitch.map((point) => point.pitch)),
    minPitch,
    maxPitch
  };
};

export const parseYawLimits = (value: XmlValue | undefined): [number, number] | undefined => {
  const values = nums(value);

  return values.length === 2 ? [values[0], values[1]] : undefined;
};

export const parseRate = (value: XmlValue | undefined): RateOfFire | undefined => {
  const container = node(value);
  const count = num(container?.count);

  if (!container || count === undefined) {
    return undefined;
  }

  const rate = num(container.rate) ?? 0;

  return { count, rate, interval: count > 1 && rate > 0 ? 60 / rate : 0 };
};

export const sharedRecord = (root: XmlNode): Record<string, XmlNode> => {
  const record: Record<string, XmlNode> = {};

  for (const [name, value] of entries(root.shared)) {
    const definition = node(value);

    if (definition) {
      record[name] = definition;
    }
  }

  return record;
};
