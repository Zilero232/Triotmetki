import type { ModifierEffect, ProvisionOption } from '@otmetki/schemas';

import { isNumber, isPlainObject, isString } from 'remeda';

import type { Provision } from '../../../../generated';
import type { PriceOfInput, ReadStringInput } from './provision-option.types';

import { PROVISION_KIND } from '../config/provisions.constants';

const readString = ({ record, key }: ReadStringInput): string | null => {
  const value = record[key];

  return isString(value) ? value : null;
};

const toEffect = (value: unknown): ModifierEffect[] => {
  if (!isPlainObject(value) || !isString(value.attribute) || !isNumber(value.value) || (value.op !== 'add' && value.op !== 'mul')) {
    return [];
  }

  return [
    {
      attribute: value.attribute,
      op: value.op,
      value: value.value,
      specValue: isNumber(value.specValue) ? value.specValue : null,
      condition: isString(value.condition) ? value.condition : null
    }
  ];
};

const priceOf = ({ row, data }: PriceOfInput): ProvisionOption['price'] => {
  const price = data.price;

  if (isPlainObject(price) && isNumber(price.amount) && isString(price.currency)) {
    return { amount: price.amount, currency: price.currency };
  }

  if (row.priceGold !== null) {
    return { amount: row.priceGold, currency: 'gold' };
  }

  return row.priceCredit === null ? null : { amount: row.priceCredit, currency: 'credits' };
};

export const toProvisionOption = (row: Provision): ProvisionOption => {
  const data = isPlainObject(row.data) ? row.data : {};

  return {
    id: row.provisionId,
    tag: row.tag ?? row.name,
    name: row.name,
    kind: PROVISION_KIND[row.type],
    variant: readString({ record: data, key: 'kind' }),
    group: readString({ record: data, key: 'groupName' }) ?? readString({ record: data, key: 'archetype' }),
    image: row.image,
    price: priceOf({ row, data }),
    categories: Array.isArray(data.categories) ? data.categories.filter(isString) : [],
    effects: Array.isArray(data.modifiers) ? data.modifiers.flatMap(toEffect) : []
  };
};
