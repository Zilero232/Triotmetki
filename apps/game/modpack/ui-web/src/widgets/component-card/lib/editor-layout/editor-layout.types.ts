import type { UiEditor, UiField } from '../../../../shared/api/protocol';

export type EditorRowKind = 'control' | 'gallery' | 'swatches';

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
  options: EditorOption[];
};

export type EditorGroup = {
  id: string;
  label: string;
  rows: EditorRow[];
};

export type EditorRowInput = {
  field: UiField;
  editor: UiEditor;
};

export type EditorGroupsInput = {
  fields: UiField[];
  editor: UiEditor;
  otherLabel: string;
  advancedLabel: string;
};
