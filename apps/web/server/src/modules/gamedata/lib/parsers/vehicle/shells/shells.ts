import type { Shell } from '@otmetki/gamedata';

import type { ParseShellsInput } from '../vehicle.types';

import { makeCompactDescr, nationId } from '../../../ids/ids';
import { bool, entries, get, isXmlNode, localizationFallback, localizationKey, num, parseXml, price, text } from '../../../xml/xml';
import { SHELLS } from '../vehicle.constants';

export const parseShells = ({ xml, nation }: ParseShellsInput): Record<string, Shell> => {
  const nationIndex = nationId(nation);
  const shells: Record<string, Shell> = {};

  for (const [name, value] of entries(parseXml(xml))) {
    if (!isXmlNode(value)) {
      continue;
    }

    const id = num(value.id);
    const kind = text(value.kind);

    if (id === undefined || !kind) {
      continue;
    }

    const icon = text(value.icon);

    shells[name] = {
      name,
      id,
      shellId: makeCompactDescr({ itemType: 'shell', nationId: nationIndex, id }),
      nation,
      nameKey: localizationKey(value.userString),
      displayName: localizationFallback(value.userString) ?? name,
      kind,
      caliber: num(value.caliber) ?? 0,
      damage: {
        armor: num(get({ value, path: 'damage/armor' })) ?? 0,
        devices: num(get({ value, path: 'damage/devices' })) ?? 0
      },
      explosionRadius: num(value.explosionRadius),
      mechanics: text(value.mechanics),
      icon,
      isPremium: (icon?.endsWith(SHELLS.premiumIconSuffix) ?? false) || (bool(value.improved) ?? false),
      isTracer: bool(value.isTracer) ?? false,
      price: price(value.price)
    };
  }

  return shells;
};
