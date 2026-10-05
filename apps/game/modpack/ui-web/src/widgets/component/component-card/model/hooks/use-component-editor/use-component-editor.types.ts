import type { UiComponent } from '@/shared/api/protocol';

export type UseComponentEditorInput = {
  component: UiComponent;
  compact: boolean;
};

export type EditorBackdrop = 'forest' | 'snow';

export type EditorHint = {
  label: string;
  text: string | null;
};
