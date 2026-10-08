import { describe, expect, it } from 'vitest';

import type { UiEditor, UiField } from '@/shared/api/protocol';

import { editorGroups, editorRow, foldAdvanced } from '../editor-layout';

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

    expect(row).toEqual({ field: size, kind: 'control', stacked: false, options: [], optionRows: [] });
  });
});

describe('editorRow layout', () => {
  const choice = (labels: string[]): UiField => ({
    key: 'pick',
    label: 'Pick',
    hint: null,
    type: 'choice',
    value: labels[0] ?? '',
    default: labels[0] ?? '',
    choices: labels.map((label) => ({ value: label, label }))
  });

  it('keeps a choice that fits one row as chips', () => {
    expect(editorRow({ field: choice(['On', 'Off']), editor }).kind).toBe('chips');
  });

  it('turns a choice that would wrap into a drop-down', () => {
    expect(editorRow({ field: choice(['Как в игре', '0', '1', '2', '3', '4', '5']), editor }).kind).toBe('select');
  });

  it('stacks a text field under its label so the input takes the full width', () => {
    const text: UiField = { key: 'text', label: 'Text', hint: null, type: 'text', value: '', default: '', max_length: 120 };

    expect(editorRow({ field: text, editor })).toMatchObject({ kind: 'text', stacked: true });
  });

  it('lays a gallery out in rows that fit the column', () => {
    const many: UiField = { ...mark, choices: Array.from({ length: 12 }, (_, index) => ({ value: String(index), label: String(index) })) };

    expect(editorRow({ field: many, editor }).optionRows.map((row) => row.length)).toEqual([5, 5, 2]);
  });

  it('keeps a few swatches inline next to the label', () => {
    expect(editorRow({ field: color, editor }).stacked).toBe(false);
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

describe(foldAdvanced, () => {
  const groups = editorGroups({
    fields: [mark, extra, { ...extra, key: 'alpha', advanced: true }],
    editor,
    otherLabel: 'More',
    advancedLabel: 'Advanced'
  });

  it('takes the advanced group out of the side column of a list page', () => {
    const { side } = foldAdvanced({ groups, isListPage: true });

    expect(side.map(({ id }) => id)).toEqual(['shape', 'other']);
  });

  it('puts the advanced group under the list of a list page', () => {
    const { folded } = foldAdvanced({ groups, isListPage: true });

    expect(folded?.id).toBe('advanced');
  });

  it('keeps every group in the side column of a settings page', () => {
    const { side, folded } = foldAdvanced({ groups, isListPage: false });

    expect({ side: side.length, folded }).toEqual({ side: 3, folded: null });
  });

  it('folds nothing when the page has no advanced fields', () => {
    const plain = editorGroups({ fields: [mark], editor, otherLabel: 'More', advancedLabel: 'Advanced' });

    expect(foldAdvanced({ groups: plain, isListPage: true }).folded).toBeNull();
  });
});
