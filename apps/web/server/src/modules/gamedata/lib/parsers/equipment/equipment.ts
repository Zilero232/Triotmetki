import type { Equipment, EquipmentKind, Modifier, SkillBoost } from '@otmetki/gamedata';

import type { XmlNode } from '../../xml/xml.types';
import type { BoosterModifiersInput, EquipmentKindInput, EquipmentModifiersInput, OptionalModifierInput, SkillBoostInput } from './equipment.types';

import { oneOf } from '../../guards/guards';
import { provisionIdOf } from '../../ids/ids';
import { parseDeviceTagFilter } from '../../modifiers/modifiers';
import {
  bool,
  entries,
  get,
  identifiedNodes,
  isXmlNode,
  localizationFallback,
  localizationKey,
  nodes,
  num,
  nums,
  price,
  scalars,
  scriptName,
  text,
  words
} from '../../xml/xml';
import { parseVehicleFilter } from '../vehicle-filter/vehicle-filter';
import { CONSUMABLE_SCRIPTS, EQUIPMENT_SCRIPT, EQUIPMENT_TYPE, REPAIRKIT_TAG, SKILL_BOOSTER_SCRIPTS } from './equipment.constants';

const isConsumableScript = oneOf(CONSUMABLE_SCRIPTS);

const isSkillBoosterScript = oneOf(SKILL_BOOSTER_SCRIPTS);

const equipmentKind = ({ equipmentType, scriptClass }: EquipmentKindInput): EquipmentKind => {
  if (equipmentType === EQUIPMENT_TYPE.battleBoosters) {
    return 'directive';
  }

  if (equipmentType === EQUIPMENT_TYPE.battleAbilities) {
    return 'ability';
  }

  return isConsumableScript(scriptClass) ? 'consumable' : 'other';
};

const optionalModifier = ({ value, ...modifier }: OptionalModifierInput): Modifier[] => (value === undefined ? [] : [{ ...modifier, value }]);

const boosterModifiers = ({ script, op }: BoosterModifiersInput): Modifier[] =>
  nodes(script.level).flatMap((level) => {
    const attribute = text(level.attribute);
    const value = num(op === 'mul' ? level.factor : level.value);

    if (!attribute || value === undefined) {
      return [];
    }

    const requiresDevice = parseDeviceTagFilter(level.deviceFilter);

    return [requiresDevice ? { attribute, op, value, requiresDevice } : { attribute, op, value }];
  });

const invisibilityBoosterModifiers = (script: XmlNode): Modifier[] =>
  nodes(script.level).flatMap((level): Modifier[] => {
    const [additive, mult] = nums(level.factors);
    const requiresDevice = parseDeviceTagFilter(level.deviceFilter);
    const modifiers: Modifier[] = [];

    if (additive !== undefined) {
      modifiers.push({ attribute: 'invisibility/additive', op: 'add', value: additive, requiresDevice });
    }

    if (mult !== undefined) {
      modifiers.push({ attribute: 'invisibility/mult', op: 'mul', value: mult, requiresDevice });
    }

    return modifiers;
  });

const economicModifiers = (script: XmlNode): Modifier[] =>
  entries(script.modifiers).flatMap(([op, items]) =>
    nodes(items).flatMap((item): Modifier[] => {
      const name = text(item.name);
      const value = num(item.value);

      if (!name || value === undefined) {
        return [];
      }

      return op === 'mul'
        ? [{ attribute: `economy/${name}`, op: 'mul', value: 1 + value / 100 }]
        : [{ attribute: `economy/${name}`, op: 'add', value }];
    })
  );

const equipmentModifiers = ({ script, scriptClass, tags }: EquipmentModifiersInput): Modifier[] => {
  switch (scriptClass) {
    case EQUIPMENT_SCRIPT.fuel:
      return [
        ...optionalModifier({ attribute: 'engine/power', op: 'mul', value: num(script.enginePowerFactor) }),
        ...optionalModifier({ attribute: 'turret/rotationSpeed', op: 'mul', value: num(script.turretRotationSpeedFactor) })
      ];
    case EQUIPMENT_SCRIPT.stimulator:
      return optionalModifier({ attribute: 'crewLevelIncrease', op: 'add', value: num(script.crewLevelIncrease) });
    case EQUIPMENT_SCRIPT.removedRpmLimiter:
    case EQUIPMENT_SCRIPT.afterburning:
      return optionalModifier({ attribute: 'engine/power', op: 'mul', condition: 'active', value: num(script.enginePowerFactor) });
    case EQUIPMENT_SCRIPT.extinguisher:
      return optionalModifier({ attribute: 'engine/fireStartingChance', op: 'mul', value: num(script.fireStartingChanceFactor) });
    case EQUIPMENT_SCRIPT.repairkit: {
      const bonus = num(script.bonusValue);

      return tags.includes(REPAIRKIT_TAG) && bonus ? [{ attribute: 'repairSpeed', op: 'mul', value: 1 + bonus }] : [];
    }

    case EQUIPMENT_SCRIPT.factorBooster:
      return boosterModifiers({ script, op: 'mul' });
    case EQUIPMENT_SCRIPT.additiveBooster:
      return boosterModifiers({ script, op: 'add' });
    case EQUIPMENT_SCRIPT.invisibilityBooster:
      return invisibilityBoosterModifiers(script);
    case EQUIPMENT_SCRIPT.economicDirectives:
      return economicModifiers(script);
    default:
      return [];
  }
};

const skillBoost = ({ script, scriptClass }: SkillBoostInput): SkillBoost | undefined => {
  const skill = text(script.skillName);

  if (!skill || !isSkillBoosterScript(scriptClass)) {
    return undefined;
  }

  return { skill, perkLevelMultiplier: num(script.perkLevelMultiplier), efficiencyFactor: num(script.efficiencyFactor) };
};

export const parseEquipments = (xml: string): Equipment[] =>
  identifiedNodes(xml).flatMap(({ name, id, value }) => {
    const script = isXmlNode(value.script) ? value.script : {};
    const scriptClass = scriptName(value.script);
    const equipmentType = text(value.type) ?? EQUIPMENT_TYPE.regular;
    const tags = words(value.tags);

    return [
      {
        name,
        id,
        provisionId: provisionIdOf({ itemType: 'equipment', id }),
        nameKey: localizationKey(value.userString),
        displayName: localizationFallback(value.userString) ?? name,
        descriptionKey: localizationKey(value.longDescriptionSpecial ?? value.description),
        icon: text(value.icon),
        kind: equipmentKind({ equipmentType, scriptClass }),
        equipmentType,
        script: scriptClass,
        tags,
        incompatibleTags: words(get({ value, path: 'incompatibleTags/installed' })),
        price: price(value.price),
        notInShop: bool(value.notInShop) ?? false,
        vehicleFilter: parseVehicleFilter(value.vehicleFilter),
        modifiers: equipmentModifiers({ script, scriptClass, tags }),
        skillBoost: skillBoost({ script, scriptClass }),
        params: scalars(script)
      }
    ];
  });
