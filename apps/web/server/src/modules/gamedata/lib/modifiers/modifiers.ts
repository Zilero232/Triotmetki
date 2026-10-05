import type { DeviceTagFilter, Modifier } from '@otmetki/gamedata';

import { MODIFIER_OPS } from '@otmetki/gamedata';

import type { XmlValue } from '../xml/xml.types';

import { oneOf } from '../guards/guards';
import { entries, get, node, nodes, num, nums, text, words } from '../xml/xml';

const isModifierOp = oneOf(MODIFIER_OPS);

export const parseModifierBlock = (value: XmlValue | undefined): Modifier[] =>
  entries(value).flatMap(([op, items]) => {
    if (!isModifierOp(op)) {
      return [];
    }

    return nodes(items).flatMap((item) => {
      const attribute = text(item.name);
      const amount = num(item.value);

      return attribute && amount !== undefined ? [{ attribute, op, value: amount }] : [];
    });
  });

export const parseFactorBlock = (value: XmlValue | undefined): Modifier[] =>
  nodes(get({ value, path: 'factor' })).flatMap((factor) => {
    const attribute = text(factor.attribute);
    const op = text(factor.type) ?? 'mul';
    const levels = nums(factor.valueByLevel);

    if (!attribute || !isModifierOp(op) || levels.length === 0) {
      return [];
    }

    const modifier: Modifier = { attribute, op, value: levels[0] };

    if (levels.length > 1) {
      modifier.specValue = levels[1];
    }

    return [modifier];
  });

export const parseDeviceTagFilter = (value: XmlValue | undefined): DeviceTagFilter | undefined => {
  const tags = node(get({ value, path: 'tags' }));

  if (!tags) {
    return undefined;
  }

  return { required: words(tags.required), incompatible: words(tags.incompatible) };
};
