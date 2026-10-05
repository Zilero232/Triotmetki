import type { UiComponent, UiEditor } from '@/shared/api/protocol';

export type UseComponentEditorInput = {
  component: UiComponent;
  editor: UiEditor;
};

export type EditorBackdrop = 'forest' | 'snow';

export type EditorHint = {
  label: string;
  text: string | null;
};
