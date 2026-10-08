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

describe('presetSelection', () => {
  const withoutHitLog = components.map((component) => (component.id === 'hit_log' ? { ...component, presets: [] } : component));

  it('picks every component of the catalogue for the everything preset', () => {
    const selection = presetSelection({ components: withoutHitLog, presets, presetId: 'all' });

    expect(selection.has('hit_log')).toBe(true);
  });

  it('picks only the members of a regular preset and what they need', () => {
    const selection = presetSelection({ components: withoutHitLog, presets, presetId: 'recommended' });

    expect([...selection].toSorted()).toEqual(['companion', 'core', 'damage_log', 'marks_panel']);
  });

  it('picks only the required components for an unknown preset', () => {
    const selection = presetSelection({ components, presets, presetId: 'nope' });

    expect([...selection].toSorted()).toEqual(['companion', 'core']);
  });
});

describe('toggleSelection', () => {
  const full = presetSelection({ components, presets, presetId: presets[0]?.id ?? null });

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
  const presetPicked = presetSelection({ components, presets, presetId: first?.id ?? null });

  it('names the preset a selection equals', () => {
    expect(matchingPreset({ components, presets, selection: presetPicked })).toBe(first?.id);
  });

  it('falls back to the custom preset for a selection no preset equals', () => {
    const changed = toggleSelection({ components, selection: presetPicked, id: 'hit_log', checked: false });

    expect(matchingPreset({ components, presets, selection: changed })).toBe(presets.find((preset) => preset.custom)?.id);
  });
});
