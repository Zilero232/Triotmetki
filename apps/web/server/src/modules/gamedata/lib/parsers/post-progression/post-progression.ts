import type {
  FieldModification,
  ModificationPair,
  PostProgression,
  Price,
  ProgressionFeature,
  ProgressionTree,
  VehicleProgressionStep
} from '@otmetki/gamedata';

import type { ParsePostProgressionInput, ResolveVehicleProgressionInput } from './post-progression.types';

import { fieldModificationIdOf } from '../../ids/ids';
import { parseModifierBlock } from '../../modifiers/modifiers';
import { entries, get, isXmlNode, nodes, num, nums, parseXml, price, text } from '../../xml/xml';
import { FIELD_MODIFICATION_TEXT } from './post-progression.constants';

const parseTrees = (xml: string): ProgressionTree[] =>
  entries(parseXml(xml)).flatMap(([name, value]) => {
    if (!isXmlNode(value)) {
      return [];
    }

    return [
      {
        name,
        id: num(value.id) ?? 0,
        rootStep: num(value.rootStep) ?? 1,
        steps: nodes(get({ value, path: 'steps/step' })).map((step) => ({
          id: num(step.id) ?? 0,
          level: num(step.level) ?? 0,
          priceKey: text(step.price),
          action: { type: text(get({ value: step, path: 'action/type' })) ?? '', value: text(get({ value: step, path: 'action/value' })) ?? '' },
          unlocks: nums(step.unlocks),
          minVehicleLevel: num(get({ value: step, path: 'vehicleFilter/include/vehicle/minLevel' })),
          maxVehicleLevel: num(get({ value: step, path: 'vehicleFilter/include/vehicle/maxLevel' }))
        }))
      }
    ];
  });

const parseModifications = (xml: string): FieldModification[] =>
  entries(parseXml(xml)).flatMap(([name, value]) => {
    const id = isXmlNode(value) ? num(value.id) : undefined;

    if (!isXmlNode(value) || id === undefined) {
      return [];
    }

    const locName = text(value.locName);

    return [
      {
        name,
        id,
        provisionId: fieldModificationIdOf(id),
        nameKey: `${FIELD_MODIFICATION_TEXT.namePrefix}${locName ?? name}${FIELD_MODIFICATION_TEXT.nameSuffix}`,
        locName,
        imgName: text(value.imgName),
        modifiers: parseModifierBlock(value.modifiers)
      }
    ];
  });

const parsePairs = (xml: string): ModificationPair[] =>
  entries(parseXml(xml)).flatMap(([name, value]) => {
    const firstName = text(get({ value, path: 'first/name' }));
    const secondName = text(get({ value, path: 'second/name' }));

    if (!isXmlNode(value) || !firstName || !secondName) {
      return [];
    }

    return [{ name, id: num(value.id) ?? 0, first: firstName, second: secondName, priceKey: text(get({ value, path: 'first/price' })) }];
  });

const parseFeatures = (xml: string): ProgressionFeature[] =>
  entries(parseXml(xml)).flatMap(([name, value]) =>
    isXmlNode(value) ? [{ name, id: num(value.id) ?? 0, imgName: text(value.imgName), locName: text(value.locName) }] : []
  );

const parsePrices = (xml: string): Record<string, Record<number, Price>> => {
  const prices: Record<string, Record<number, Price>> = {};

  for (const [key, levels] of entries(parseXml(xml))) {
    const byLevel: Record<number, Price> = {};

    for (const [levelKey, value] of entries(levels)) {
      const level = Number(levelKey.replace('level_', ''));
      const amount = price(value);

      if (Number.isFinite(level) && amount) {
        byLevel[level] = amount;
      }
    }

    prices[key] = byLevel;
  }

  return prices;
};

export const parsePostProgression = ({
  treesXml,
  modificationsXml,
  pairsXml,
  featuresXml,
  pricesXml
}: ParsePostProgressionInput): PostProgression => ({
  trees: parseTrees(treesXml),
  modifications: parseModifications(modificationsXml),
  pairs: pairsXml ? parsePairs(pairsXml) : [],
  features: featuresXml ? parseFeatures(featuresXml) : [],
  prices: pricesXml ? parsePrices(pricesXml) : {}
});

export const resolveVehicleProgression = ({ progression, treeName, vehicleTier }: ResolveVehicleProgressionInput): VehicleProgressionStep[] => {
  const tree = progression.trees.find((item) => item.name === treeName);

  if (!tree) {
    return [];
  }

  const modifications = new Map(progression.modifications.map((item) => [item.name, item]));
  const pairs = new Map(progression.pairs.map((item) => [item.name, item]));

  return tree.steps
    .filter(
      (step) =>
        (step.minVehicleLevel === undefined || vehicleTier >= step.minVehicleLevel) &&
        (step.maxVehicleLevel === undefined || vehicleTier <= step.maxVehicleLevel)
    )
    .map((step) => {
      if (step.action.type === 'modification') {
        return { ...step, modification: modifications.get(step.action.value) };
      }

      const pair = step.action.type === 'pair_modification' ? pairs.get(step.action.value) : undefined;
      const first = pair ? modifications.get(pair.first) : undefined;
      const second = pair ? modifications.get(pair.second) : undefined;

      return first && second ? { ...step, pair: [first, second] } : step;
    });
};
