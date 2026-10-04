import { describe, expect, it } from 'vitest';

import type { UiEditor, UiField } from '../../../../../shared/api/protocol';

import { editorGroups, editorRow } from '../editor-layout';

const mark: UiField = {
  key: 'mark',
  label: 'Mark',
  hint: null,
  type: 'choice',
  value: 'dot',
  default: 'none',
  choices: [
    { value: 'none', label: 'None' },
    { value: 'dot', label: 'Dot' }
  ]
};

const color: UiField = {
  key: 'mark_color',
  label: 'Colour',
  hint: null,
  type: 'choice',
  value: 'red',
  default: 'white',
  choices: [
    { value: 'white', label: 'White' },
    { value: 'red', label: 'Red' }
  ]
};

const size: UiField = { key: 'mark_size', label: 'Size', hint: null, type: 'int', value: 48, default: 48, min: 16, max: 128 };

const extra: UiField = { key: 'extra', label: 'Extra', hint: null, type: 'bool', value: false, default: false };

const editor: UiEditor = {
  groups: [
    { id: 'shape', label: 'Shape', keys: ['mark'] },
    { id: 'look', label: 'Look', keys: ['mark_color', 'mark_size', 'gone'] },
    { id: 'empty', label: 'Empty', keys: ['gone'] }
  ],
  icons: { mark: { dot: 'img://dot.png' } },
  swatches: { mark_color: { white: '#ffffff', red: '#ff0000' } }
};

describe(editorRow, () => {
  it('shows a choice with icons as a gallery', () => {
    const row = editorRow({ field: mark, editor });

    expect(row.kind).toBe('gallery');
  });

  it('gives each gallery option its icon, or none', () => {
    const row = editorRow({ field: mark, editor });

    expect(row.options.map(({ icon }) => icon)).toEqual([null, 'img://dot.png']);
  });

  it('marks the chosen option', () => {
    const row = editorRow({ field: mark, editor });

    expect(row.options.map(({ selected }) => selected)).toEqual([false, true]);
  });

  it('shows a choice with swatches as swatches', () => {
    const row = editorRow({ field: color, editor });

    expect(row.options.map(({ swatch }) => swatch)).toEqual(['#ffffff', '#ff0000']);
  });

  it('keeps any other field as a plain control', () => {
    const row = editorRow({ field: size, editor });

    expect(row).toEqual({ field: size, kind: 'control', options: [] });
  });
});

describe(editorGroups, () => {
  it('lays the fields out in the editor groups, skipping unknown keys and empty groups', () => {
    const groups = editorGroups({ fields: [size, mark, color], editor, otherLabel: 'More', advancedLabel: 'Advanced' });

    expect(groups.map(({ id, rows }) => [id, rows.map(({ field }) => field.key)])).toEqual([
      ['shape', ['mark']],
      ['look', ['mark_color', 'mark_size']]
    ]);
  });

  it('puts the fields no group names in a last group', () => {
    const groups = editorGroups({ fields: [mark, extra], editor, otherLabel: 'More', advancedLabel: 'Advanced' });

    expect(groups.at(-1)).toMatchObject({ id: 'other', label: 'More', rows: [{ field: extra, kind: 'control' }] });
  });

  it('folds the advanced fields into their own last group', () => {
    const folded = { ...extra, key: 'alpha', advanced: true };

    const groups = editorGroups({ fields: [mark, extra, folded], editor, otherLabel: 'More', advancedLabel: 'Advanced' });

    expect(groups.map(({ id }) => id).slice(-2)).toEqual(['other', 'advanced']);
  });
});
