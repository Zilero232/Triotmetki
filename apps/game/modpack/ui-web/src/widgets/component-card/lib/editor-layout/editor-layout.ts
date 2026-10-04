import { indexBy, isNonNullish } from 'remeda';

import type { EditorGroup, EditorGroupsInput, EditorRow, EditorRowInput, EditorRowKind } from './editor-layout.types';

import { EDITOR } from '../../config';

const rowKind = ({ field, editor }: EditorRowInput): EditorRowKind => {
  if (field.type !== 'choice') {
    return 'control';
  }

  if (editor.icons[field.key]) {
    return 'gallery';
  }

  return editor.swatches[field.key] ? 'swatches' : 'control';
};

export const editorRow = ({ field, editor }: EditorRowInput): EditorRow => {
  const kind = rowKind({ field, editor });

  if (field.type !== 'choice' || kind === 'control') {
    return { field, kind, options: [] };
  }

  const icons = editor.icons[field.key] ?? {};
  const swatches = editor.swatches[field.key] ?? {};

  return {
    field,
    kind,
    options: field.choices.map(({ value, label }) => ({
      value,
      label,
      icon: icons[value] ?? null,
      swatch: swatches[value] ?? null,
      selected: value === field.value
    }))
  };
};

export const editorGroups = ({ fields, editor, otherLabel, advancedLabel }: EditorGroupsInput): EditorGroup[] => {
  const byKey = indexBy(fields, ({ key }) => key);
  const placed = new Set(editor.groups.flatMap(({ keys }) => keys));
  const rest = fields.filter(({ key, advanced }) => !placed.has(key) && !advanced);
  const folded = fields.filter(({ key, advanced }) => !placed.has(key) && advanced === true);

  const groups = editor.groups
    .map(({ id, label, keys }) => ({
      id,
      label,
      rows: keys
        .map((key) => byKey[key])
        .filter(isNonNullish)
        .map((field) => editorRow({ field, editor }))
    }))
    .filter(({ rows }) => rows.length > 0);

  const extra = [
    { id: EDITOR.otherGroup, label: otherLabel, rows: rest.map((field) => editorRow({ field, editor })) },
    { id: EDITOR.advancedGroup, label: advancedLabel, rows: folded.map((field) => editorRow({ field, editor })) }
  ];

  return [...groups, ...extra.filter(({ rows }) => rows.length > 0)];
};
