import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import type { EquipmentItem } from '../../../model/schemas';

import { battleLoadoutSchema } from '../../../model/schemas';
import { loadoutEntries } from '../loadout-view';

const { items } = battleLoadoutSchema.parse(readWidgetFixture('battle_loadout'));

const kinds = (entries: ReturnType<typeof loadoutEntries>) => entries.map((entry) => entry.kind);

const devicesOnly = (): EquipmentItem[] => items.filter((item) => item.kind === 'device');

describe(loadoutEntries, () => {
  it('parts the equipment from the directive with a divider', () => {
    expect(kinds(loadoutEntries(items))).toEqual(['slot', 'slot', 'slot', 'slot', 'divider', 'slot']);
  });

  it('keeps each slot at the index of its item', () => {
    const slots = loadoutEntries(items).flatMap((entry) => (entry.kind === 'slot' ? [entry.index] : []));

    expect(slots).toEqual([0, 1, 2, 3, 4]);
  });

  it('draws no divider without a directive', () => {
    expect(kinds(loadoutEntries(devicesOnly()))).not.toContain('divider');
  });

  it('keys a slot by its place, so a slot filled in battle keeps its cell', () => {
    const keys = loadoutEntries(items).flatMap((entry) => (entry.kind === 'slot' ? [entry.key] : []));

    expect(keys).toEqual(['device-0', 'device-1', 'device-2', 'device-3', 'directive-4']);
  });
});
