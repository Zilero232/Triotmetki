import type { VehicleListEntry } from '@otmetki/gamedata';

import type { ParseVehicleListInput } from './vehicle-list.types';

import { oneOf } from '../../guards/guards';
import { makeCompactDescr, nationId } from '../../ids/ids';
import { bool, entries, isXmlNode, localizationFallback, localizationKey, num, parseXml, price, words } from '../../xml/xml';
import { EXCLUDED_VEHICLE_NAME, EXCLUDED_VEHICLE_TAGS, VEHICLE_CLASSES, VEHICLE_TAG } from './vehicle-list.constants';

const isVehicleClass = oneOf(VEHICLE_CLASSES);

const isExcludedTag = oneOf(EXCLUDED_VEHICLE_TAGS);

export const parseVehicleList = ({ xml, nation }: ParseVehicleListInput): VehicleListEntry[] => {
  const nationIndex = nationId(nation);

  return entries(parseXml(xml)).flatMap(([tag, value]) => {
    if (!isXmlNode(value)) {
      return [];
    }

    const id = num(value.id);
    const tier = num(value.level);
    const tags = words(value.tags);
    const type = tags.find(isVehicleClass);

    if (id === undefined || tier === undefined || !type) {
      return [];
    }

    const vehiclePrice = price(value.price);
    const name = localizationFallback(value.userString) ?? tag;

    return [
      {
        tag,
        id,
        tankId: makeCompactDescr({ itemType: 'vehicle', nationId: nationIndex, id }),
        nation,
        tier,
        type,
        role: tags.find((item) => item.startsWith(VEHICLE_TAG.rolePrefix)),
        tags,
        nameKey: localizationKey(value.userString),
        shortNameKey: localizationKey(value.shortUserString),
        descriptionKey: localizationKey(value.description),
        name,
        shortName: localizationFallback(value.shortUserString) ?? name,
        price: vehiclePrice,
        notInShop: bool(value.notInShop) ?? false,
        isPremium: vehiclePrice?.currency === 'gold',
        isCollectible: tags.includes(VEHICLE_TAG.collector),
        isWheeled: tags.includes(VEHICLE_TAG.wheeled),
        isSecret: tags.includes(VEHICLE_TAG.secret),
        isClone: value.clone_tags !== undefined
      }
    ];
  });
};

export const isRegularVehicle = (entry: VehicleListEntry): boolean =>
  !entry.isClone && !EXCLUDED_VEHICLE_NAME.test(entry.tag) && !entry.tags.some(isExcludedTag);
