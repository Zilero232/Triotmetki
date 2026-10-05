import type { UiEditor, UiField } from '@/shared/api/protocol';

export type EditorRowKind = 'chips' | 'control' | 'gallery' | 'select' | 'swatches' | 'text';

export type EditorOption = {
  value: string;
  label: string;
  icon: string | null;
  swatch: string | null;
  selected: boolean;
};

export type EditorRow = {
  field: UiField;
  kind: EditorRowKind;
  stacked: boolean;
  options: EditorOption[];
  optionRows: EditorOption[][];
};

export type EditorGroup = {
  id: string;
  label: string;
  rows: EditorRow[];
};

export type EditorRowInput = {
  field: UiField;
  editor: UiEditor;
  rowWidth?: number;
};

export type EditorGroupsInput = {
  fields: UiField[];
  editor: UiEditor;
  rowWidth?: number;
  otherLabel: string;
  advancedLabel: string;
};
