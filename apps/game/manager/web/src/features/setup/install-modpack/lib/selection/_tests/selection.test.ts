import catalog from '@contract/catalog.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';

import { closeDependencies, matchingPreset, presetSelection, toggleSelection } from '../selection';

const { components, presets } = catalogSchema.parse(catalog);
const required = components.filter((component) => component.required).map((component) => component.id);

describe('closeDependencies', () => {
  it('adds what a component needs and every required component', () => {
    const selection = closeDependencies({ components, ids: ['hit_log'] });

    expect([...selection].toSorted()).toEqual([...required, 'damage_log', 'hit_log'].toSorted());
  });

  it('drops ids the catalog does not know', () => {
    expect(closeDependencies({ components, ids: ['battle'] }).has('battle')).toBe(false);
  });
});

describe('toggleSelection', () => {
  const full = presetSelection({ components, presetId: presets[0]?.id ?? null });

  it('unticks the unticked component', () => {
    expect(toggleSelection({ components, selection: full, id: 'damage_log', checked: false }).has('damage_log')).toBe(false);
  });

  it('unticks what depends on the unticked component', () => {
    expect(toggleSelection({ components, selection: full, id: 'damage_log', checked: false }).has('hit_log')).toBe(false);
  });

  it('never unticks a required component', () => {
    const [core = ''] = required;

    expect(toggleSelection({ components, selection: full, id: core, checked: false })).toBe(full);
  });
});

describe('matchingPreset', () => {
  const [first] = presets;
  const presetPicked = presetSelection({ components, presetId: first?.id ?? null });

  it('names the preset a selection equals', () => {
    expect(matchingPreset({ components, presets, selection: presetPicked })).toBe(first?.id);
  });

  it('falls back to the custom preset for a selection no preset equals', () => {
    const changed = toggleSelection({ components, selection: presetPicked, id: 'hit_log', checked: false });

    expect(matchingPreset({ components, presets, selection: changed })).toBe(presets.find((preset) => preset.custom)?.id);
  });
});
