import type { EquipmentItem } from '../../model/schemas';
import type { LoadoutEntry } from './loadout-view.types';

const isDirective = (item: EquipmentItem): boolean => item.kind === 'directive';

export const loadoutEntries = (items: EquipmentItem[]): LoadoutEntry[] =>
  items.flatMap((item, index) => {
    const slot: LoadoutEntry = { kind: 'slot', key: `${item.kind}-${String(index)}`, index, item };
    const previous = items[index - 1];
    const startsDirectives = previous !== undefined && isDirective(item) && !isDirective(previous);

    return startsDirectives ? [{ kind: 'divider', key: `divider-${String(index)}` }, slot] : [slot];
  });
