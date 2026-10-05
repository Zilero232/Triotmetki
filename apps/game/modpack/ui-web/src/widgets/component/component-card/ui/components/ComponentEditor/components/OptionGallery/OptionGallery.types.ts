import type { EditorOption } from '../../../../../lib/editor-layout';

export type OptionPickerProps = {
  label: string;
  rows: EditorOption[][];
  onSelect: (value: string) => void;
  onHint: (label: string) => void;
};

export type OptionGalleryProps = OptionPickerProps;
