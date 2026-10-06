import catalogFixture from '@contract/catalog.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';

import { chosenGroups, defaultPreset, isReinstall, parkedCount, presetOptions, wizardGroups, wizardPreview, wizardSelection } from '../wizard-view';

const catalog = { ...catalogSchema.parse(catalogFixture), previewsDir: null };
const { components, presets } = catalog;
const [firstComponent] = components;
const [firstPreset] = presets;
const NONE: ReadonlySet<string> = new Set();

describe('wizardGroups', () => {
  it('groups the components by category in the catalogue order', () => {
    const groups = wizardGroups({ catalog, selection: NONE, locale: 'en' });

    expect(groups.map((group) => group.id)).toEqual(catalog.categories.map((category) => category.id));
  });

  it('ticks the selected components', () => {
    const groups = wizardGroups({ catalog, selection: new Set([firstComponent?.id ?? '']), locale: 'en' });
    const checked = groups.flatMap((group) => group.components).filter((component) => component.checked);

    expect(checked.map((component) => component.id)).toEqual([firstComponent?.id]);
  });

  it('drops a category without components', () => {
    const lonely = { ...catalog, categories: [...catalog.categories, { ...catalog.categories[0]!, id: 'empty' }] };

    expect(wizardGroups({ catalog: lonely, selection: NONE, locale: 'en' }).some((group) => group.id === 'empty')).toBe(false);
  });

  it('is empty without a catalogue', () => {
    expect(wizardGroups({ catalog: null, selection: NONE, locale: 'en' })).toEqual([]);
  });
});

describe('chosenGroups', () => {
  it('keeps only the ticked components and the groups that still have some', () => {
    const groups = wizardGroups({ catalog, selection: new Set([firstComponent?.id ?? '']), locale: 'en' });

    expect(chosenGroups(groups).map((group) => group.components.map((component) => component.id))).toEqual([[firstComponent?.id]]);
  });
});

describe('wizardPreview', () => {
  it('previews the focused component', () => {
    const last = components.at(-1);

    expect(wizardPreview({ catalog, focusedId: last?.id ?? null, locale: 'en' })?.category).toBe(last?.category);
  });

  it('falls back to the first component when nothing is focused', () => {
    expect(wizardPreview({ catalog, focusedId: null, locale: 'en' })?.category).toBe(firstComponent?.category);
  });

  it('has no preview without components', () => {
    expect(wizardPreview({ catalog: null, focusedId: null, locale: 'en' })).toBeNull();
  });
});

describe('defaultPreset', () => {
  it('takes the preset asked for', () => {
    expect(defaultPreset({ presets, initialPreset: presets.at(-1)?.id ?? null })).toBe(presets.at(-1)?.id);
  });

  it('falls back to the first preset for an unknown one', () => {
    expect(defaultPreset({ presets, initialPreset: 'unknown' })).toBe(firstPreset?.id);
  });

  it('has no preset without presets', () => {
    expect(defaultPreset({ presets: [], initialPreset: null })).toBeNull();
  });
});

describe('isReinstall', () => {
  it('is a reinstall when the modpack has components installed', () => {
    expect(isReinstall({ installed: true, currentComponents: ['core'] })).toBe(true);
  });

  it('is a fresh install when no component is installed', () => {
    expect(isReinstall({ installed: true, currentComponents: [] })).toBe(false);
  });
});

describe('wizardSelection', () => {
  const required = components.filter((component) => component.required).map((component) => component.id);

  it('starts from the components it was asked for', () => {
    const selection = wizardSelection({ plan: null, components, presetId: firstPreset?.id ?? null, initialComponents: [] });

    expect([...selection].toSorted()).toEqual(required.toSorted());
  });

  it('keeps what is installed on a reinstall', () => {
    const plan = { installed: true, currentComponents: ['hit_log'] };
    const selection = wizardSelection({ plan, components, presetId: null, initialComponents: null });

    expect(selection.has('hit_log')).toBe(true);
  });

  it('starts from the preset on a fresh install', () => {
    const selection = wizardSelection({ plan: null, components, presetId: firstPreset?.id ?? null, initialComponents: null });

    expect(selection.size).toBe(components.filter((component) => component.presets.includes(firstPreset?.id ?? '')).length);
  });
});

describe('presetOptions', () => {
  it('offers every preset by id', () => {
    expect(presetOptions({ presets, locale: 'en' }).map((option) => option.value)).toEqual(presets.map((preset) => preset.id));
  });
});

describe('parkedCount', () => {
  it('counts the parked components that are selected again', () => {
    expect(parkedCount({ parked: ['hit_log', 'damage_log'], selection: new Set(['hit_log']) })).toBe(1);
  });
});
