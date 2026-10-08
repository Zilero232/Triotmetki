import { chunk, indexBy, isNonNullish, sumBy } from 'remeda';

import type {
  ChipsFitInput,
  EditorGroup,
  EditorGroupsInput,
  EditorRow,
  EditorRowInput,
  EditorRowKind,
  FoldAdvancedInput,
  FoldedGroups,
  IsStackedInput,
  PerRowInput
} from './editor-layout.types';

import { EDITOR } from '../../config';

const { row: ROW, chip: CHIP, swatch: SWATCH, tile: TILE } = EDITOR;

const chipWidth = (label: string): number => Math.max(CHIP.minWidth, label.length * CHIP.charWidth + CHIP.padding) + CHIP.margin;

const stackedWidth = (rowWidth: number): number => rowWidth - ROW.indent;

const chipsFit = ({ field, rowWidth }: ChipsFitInput): boolean =>
  field.type === 'choice' && sumBy(field.choices, ({ label }) => chipWidth(label)) <= stackedWidth(rowWidth);

const rowKind = ({ field, editor, rowWidth = ROW.width }: EditorRowInput): EditorRowKind => {
  if (field.type === 'text') {
    return 'text';
  }

  if (field.type !== 'choice') {
    return 'control';
  }

  if (editor.icons[field.key]) {
    return 'gallery';
  }

  if (editor.swatches[field.key]) {
    return 'swatches';
  }

  return chipsFit({ field, rowWidth }) ? 'chips' : 'select';
};

const perRow = ({ kind, rowWidth }: PerRowInput): number => {
  const { size, gap } = kind === 'gallery' ? TILE : SWATCH;

  return Math.max(1, Math.floor((stackedWidth(rowWidth) + gap) / size));
};

const isStacked = ({ kind, options }: IsStackedInput): boolean => {
  if (kind === 'control') {
    return false;
  }

  return kind !== 'swatches' || options.length > SWATCH.inlineMax;
};

export const editorRow = ({ field, editor, rowWidth = ROW.width }: EditorRowInput): EditorRow => {
  const kind = rowKind({ field, editor, rowWidth });

  if (field.type !== 'choice') {
    return { field, kind, stacked: isStacked({ kind, options: [] }), options: [], optionRows: [] };
  }

  const icons = editor.icons[field.key] ?? {};
  const swatches = editor.swatches[field.key] ?? {};
  const options = field.choices.map(({ value, label }) => ({
    value,
    label,
    icon: icons[value] ?? null,
    swatch: swatches[value] ?? null,
    selected: value === field.value
  }));

  const isGrid = kind === 'gallery' || kind === 'swatches';

  return { field, kind, stacked: isStacked({ kind, options }), options, optionRows: isGrid ? chunk(options, perRow({ kind, rowWidth })) : [] };
};

export const editorGroups = ({ fields, editor, rowWidth, otherLabel, advancedLabel }: EditorGroupsInput): EditorGroup[] => {
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
        .map((field) => editorRow({ field, editor, rowWidth }))
    }))
    .filter(({ rows }) => rows.length > 0);

  const extra = [
    { id: EDITOR.otherGroup, label: otherLabel, rows: rest.map((field) => editorRow({ field, editor, rowWidth })) },
    { id: EDITOR.advancedGroup, label: advancedLabel, rows: folded.map((field) => editorRow({ field, editor, rowWidth })) }
  ];

  return [...groups, ...extra.filter(({ rows }) => rows.length > 0)];
};

export const foldAdvanced = ({ groups, isListPage }: FoldAdvancedInput): FoldedGroups => {
  const advanced = groups.find(({ id }) => id === EDITOR.advancedGroup) ?? null;

  if (!isListPage || advanced === null) {
    return { side: groups, folded: null };
  }

  return { side: groups.filter((group) => group !== advanced), folded: advanced };
};
