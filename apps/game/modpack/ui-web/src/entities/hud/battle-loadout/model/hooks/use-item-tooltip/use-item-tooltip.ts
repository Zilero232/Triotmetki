import { useEffect } from 'react';

import { nativeTooltip } from '@/shared/api/gameface';

import type { EquipmentItem } from '../../schemas';
import type { ItemTooltip } from './use-item-tooltip.types';

import { useHoveredItem } from '../use-hovered-item';

export const useItemTooltip = (items: EquipmentItem[]): ItemTooltip => {
  const { hovered, handlers } = useHoveredItem();
  const item = hovered === null ? undefined : items[hovered];
  const isNative = nativeTooltip.available();
  const name = item?.name;
  const effect = item?.effect;

  useEffect(() => {
    if (!isNative || name === undefined) {
      return undefined;
    }

    nativeTooltip.show(effect ? { header: name, body: effect } : { body: name });

    return () => nativeTooltip.hide();
  }, [isNative, name, effect]);

  return { tip: isNative ? undefined : item, handlers };
};
