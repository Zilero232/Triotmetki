import type { Modifier, OptionalDevice, OptionalDeviceKind } from '@otmetki/gamedata';

import type { XmlNode } from '../../xml/xml.types';
import type { DeviceKindInput, ScriptModifiersInput, SpecialModifierInput } from './optional-devices.types';

import { provisionIdOf } from '../../ids/ids';
import { parseFactorBlock } from '../../modifiers/modifiers';
import {
  bool,
  entries,
  get,
  identifiedNodes,
  localizationFallback,
  localizationKey,
  node,
  nums,
  price,
  scriptName,
  text,
  words
} from '../../xml/xml';
import { parseVehicleFilter } from '../vehicle-filter/vehicle-filter';
import { DEVICE_KIND_TAG, DEVICE_SCRIPT, DEVICE_SCRIPT_SUFFIXES, DEVICE_SPECIAL_MODIFIERS } from './optional-devices.constants';

const baseScript = (script: string | undefined): string | undefined => {
  if (!script) {
    return undefined;
  }

  const prefix = DEVICE_SCRIPT_SUFFIXES.find((item) => script.startsWith(item));

  if (!prefix) {
    return script;
  }

  const rest = script.slice(prefix.length);

  return rest === 'StaticDevice' ? DEVICE_SCRIPT.static : rest;
};

const deviceKind = ({ name, tags }: DeviceKindInput): OptionalDeviceKind => {
  if (tags.includes(DEVICE_KIND_TAG.deluxe)) {
    return 'deluxe';
  }

  if (tags.includes(DEVICE_KIND_TAG.trophyBasic) || tags.includes(DEVICE_KIND_TAG.trophyUpgraded) || name.startsWith('trophy')) {
    return 'trophy';
  }

  if (tags.some((tag) => tag.startsWith(DEVICE_KIND_TAG.modernizedPrefix))) {
    return 'modernized';
  }

  return 'standard';
};

const specialModifier = ({ script, param, attribute, op, condition }: SpecialModifierInput): Modifier[] => {
  const values = nums(script[param] ?? get({ value: script, path: `overridableFactors/${param}` }));

  if (values.length === 0) {
    return [];
  }

  const modifier: Modifier = { attribute, op, value: values[0] };

  if (values.length > 1) {
    modifier.specValue = values[1];
  }

  if (condition) {
    modifier.condition = condition;
  }

  return [modifier];
};

const scriptModifiers = ({ script, kind }: ScriptModifiersInput): Modifier[] => {
  const modifiers = parseFactorBlock(script.factors);
  const special = DEVICE_SPECIAL_MODIFIERS;

  switch (kind) {
    case DEVICE_SCRIPT.stereoscope:
      return [...modifiers, ...specialModifier({ script, ...special.stereoscope, op: 'mul', condition: 'still' })];
    case DEVICE_SCRIPT.camouflageNet:
      return [...modifiers, ...specialModifier({ script, ...special.camouflageNet, op: 'add', condition: 'still' })];
    case DEVICE_SCRIPT.lowNoiseTracks:
      return [...modifiers, ...specialModifier({ script, ...special.lowNoiseTracks, op: 'add' })];
    case DEVICE_SCRIPT.grousers:
      return [
        ...modifiers,
        ...specialModifier({ script, ...special.grousers, op: 'mul' }),
        ...specialModifier({ script, ...special.grousersFriction, op: 'mul' })
      ];
    case DEVICE_SCRIPT.rotationMechanisms:
      return [
        ...modifiers,
        ...specialModifier({ script, ...special.trackMove, op: 'mul', condition: 'tracked' }),
        ...specialModifier({ script, ...special.trackRotate, op: 'mul', condition: 'tracked' }),
        ...specialModifier({ script, ...special.wheelMove, op: 'mul', condition: 'wheeled' }),
        ...specialModifier({ script, ...special.wheelRotate, op: 'mul', condition: 'wheeled' }),
        ...specialModifier({ script, ...special.wheelCenter, op: 'mul', condition: 'wheeled' })
      ];
    default:
      return modifiers;
  }
};

const scriptParams = (script: XmlNode): Record<string, number[]> => {
  const params: Record<string, number[]> = {};
  const sources = [...entries(script), ...entries(script.overridableFactors)];

  for (const [key, value] of sources) {
    const values = nums(value);

    if (values.length > 0 && key !== 'factors') {
      params[key] = values;
    }
  }

  return params;
};

export const parseOptionalDevices = (xml: string): OptionalDevice[] =>
  identifiedNodes(xml).flatMap(({ name, id, value }) => {
    const script = node(value.script) ?? {};
    const scriptClass = scriptName(value.script);
    const tags = words(value.tags);

    return [
      {
        name,
        id,
        provisionId: provisionIdOf({ itemType: 'optionalDevice', id }),
        nameKey: localizationKey(value.userString),
        displayName: localizationFallback(value.userString) ?? name,
        descriptionKey: localizationKey(value.longDescriptionSpecial ?? value.description),
        icon: text(value.icon),
        kind: deviceKind({ name, tags }),
        script: scriptClass,
        archetype: text(value.archetype),
        groupName: text(value.groupName),
        tags,
        categories: words(value.categories),
        incompatibleTags: words(get({ value, path: 'incompatibleTags/installed' })),
        price: price(value.price),
        removable: bool(value.removable) ?? true,
        vehicleFilter: parseVehicleFilter(value.vehicleFilter),
        modifiers: scriptModifiers({ script, kind: baseScript(scriptClass) }),
        params: scriptParams(script),
        upgradedDevice: text(get({ value: script, path: 'upgradeInfo/upgradedDevice' }))
      }
    ];
  });
