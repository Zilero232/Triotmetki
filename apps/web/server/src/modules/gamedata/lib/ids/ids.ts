import type { Nation } from '@otmetki/gamedata';

import { NATIONS } from '@otmetki/gamedata';

import type { CompactDescr, ItemType, MakeCompactDescrInput, ProvisionIdInput, TankIdInput } from './ids.types';

import { oneOf } from '../guards/guards';
import { ITEM_TYPE, NATION_NONE } from './ids.constants';

const ITEM_TYPES = Object.keys(ITEM_TYPE).filter((key): key is ItemType => key in ITEM_TYPE);

export const isNation = oneOf(NATIONS);

export const nationId = (nation: Nation): number => NATIONS.indexOf(nation);

export const makeCompactDescr = ({ itemType, nationId: nation, id }: MakeCompactDescrInput): number => id * 256 + nation * 16 + ITEM_TYPE[itemType];

export const parseCompactDescr = (compactDescr: number): CompactDescr => {
  const typeId = compactDescr % 16;
  const itemType = ITEM_TYPES.find((key) => ITEM_TYPE[key] === typeId);

  if (!itemType) {
    throw new Error(`Unknown item type ${typeId} in compact descriptor ${compactDescr}`);
  }

  return { itemType, nationId: Math.floor(compactDescr / 16) % 16, id: Math.floor(compactDescr / 256) };
};

export const tankIdOf = ({ nation, id }: TankIdInput): number => makeCompactDescr({ itemType: 'vehicle', nationId: nationId(nation), id });

export const provisionIdOf = ({ itemType, id }: ProvisionIdInput): number => makeCompactDescr({ itemType, nationId: NATION_NONE, id });

export const fieldModificationIdOf = (id: number): number => makeCompactDescr({ itemType: 'reserved', nationId: NATION_NONE, id });
